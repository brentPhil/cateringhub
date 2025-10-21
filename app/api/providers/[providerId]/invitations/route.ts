/**
 * Provider Invitations API
 * POST /api/providers/[providerId]/invitations - Invite a new member
 *
 * Security Architecture:
 * - Uses regular authenticated client for authorization checks
 *   (verifying user has admin/owner permissions)
 * - Uses admin client ONLY for INSERT operation on provider_invitations
 *   (server-side RLS context doesn't work reliably with SSR cookies)
 * - Follows same hybrid approach as invitation acceptance flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateInvitationRequest, validateUUID } from '@/lib/api/validation';
import { generateSecureToken, generateTokenExpiration } from '@/lib/api/tokens';
import { sendInvitationEmail } from '@/lib/email/service';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RateLimiters, createRateLimitError } from '@/lib/middleware/rate-limit';

interface RouteContext {
  params: Promise<{ providerId: string }>;
}

/**
 * POST /api/providers/[providerId]/invitations
 * Create a new invitation to join the provider team
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get and validate provider ID
    const { providerId } = await context.params;
    validateUUID(providerId, 'Provider ID');

    // Authenticate user
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Rate limiting: Check if user has exceeded invite limit
    const rateLimitResult = await RateLimiters.invitations.check(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Check user has admin or owner role - query directly
    const { data: member, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status')
      .eq('provider_id', providerId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !member) {
      throw APIErrors.FORBIDDEN('You are not an active member of this provider');
    }

    // Check if user has admin or owner role
    const roleHierarchy: Record<string, number> = {
      owner: 1,
      admin: 2,
      manager: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[member.role] > roleHierarchy['admin']) {
      throw APIErrors.FORBIDDEN('You do not have permission to invite members');
    }

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const { email, role } = validateInvitationRequest(body);

    // Prevent inviting with owner role (only one owner allowed, set during provider creation)
    if (role === 'owner') {
      throw APIErrors.INVALID_INPUT(
        'Cannot invite users with owner role. Ownership can only be transferred.',
        { role }
      );
    }

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email.toLowerCase()) {
      throw APIErrors.INVALID_INPUT('You cannot invite yourself');
    }

    // Use admin client for invitation queries and mutations
    // This is necessary because server-side RLS context doesn't work reliably
    // with SSR cookie-based authentication (same issue as invitation acceptance)
    const adminClient = createAdminClient();

    // Check for pending invitation with same email
    const { data: existingInvitation } = await adminClient
      .from('provider_invitations')
      .select('id, expires_at, accepted_at')
      .eq('provider_id', providerId)
      .eq('email', email)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      // Check if invitation is still valid
      const isExpired = new Date(existingInvitation.expires_at) < new Date();

      if (!isExpired) {
        throw APIErrors.CONFLICT(
          'An invitation has already been sent to this email address and is still valid'
        );
      }

      // Delete expired invitation using admin client
      await adminClient
        .from('provider_invitations')
        .delete()
        .eq('id', existingInvitation.id);
    }

    // Generate secure token and expiration
    const token = generateSecureToken(32);
    const expiresAt = generateTokenExpiration(48);

    // Create invitation using admin client to bypass RLS
    // Authorization has already been verified above (user is admin/owner)
    const { data: invitation, error: invitationError } = await adminClient
      .from('provider_invitations')
      .insert({
        provider_id: providerId,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt,
      })
      .select('id, email, role, expires_at, created_at')
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      throw APIErrors.INTERNAL('Failed to create invitation');
    }

    // Get provider name for email
    const { data: provider } = await supabase
      .from('providers')
      .select('name')
      .eq('id', providerId)
      .single();

    // Get inviter name from current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const inviterName = currentUser?.user_metadata?.full_name || user.email || 'A team member';
    const providerName = provider?.name || 'the team';

    // Send invitation email
    try {
      await sendInvitationEmail(email, providerName, role, inviterName, token);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      throw APIErrors.INTERNAL('Failed to send invitation email');
    }

    // Audit log: Record invitation sent
    await AuditLogger.logInvitation({
      providerId,
      userId: user.id,
      actionType: 'invitation_sent',
      metadata: {
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return invitation details (without token for security)
    return NextResponse.json(
      {
        data: invitation,
        message: 'Invitation sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

