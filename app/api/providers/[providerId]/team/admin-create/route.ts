/**
 * POST /api/providers/[providerId]/team/admin-create
 * Admin endpoint to create a new team member account directly (bypassing email invitation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { requireMembership } from '@/lib/api/membership';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateEmail, validateProviderRole, validateRequired, validateUUID } from '@/lib/api/validation';
import { inviteTeamMember } from '@/lib/supabase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RateLimiters, createRateLimitError } from '@/lib/middleware/rate-limit';
import type { Database } from '@/types/supabase';

type ProviderRole = Database['public']['Enums']['provider_role'];

interface RouteContext {
  params: Promise<{ providerId: string }>;
}

/**
 * POST /api/providers/[providerId]/team/admin-create
 * Create a new team member account directly (admin-created flow)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { providerId } = await context.params;
    validateUUID(providerId, 'Provider ID');

    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Require admin or owner role
    const membership = await requireMembership(providerId, ['owner', 'admin']);

    // Rate limiting: 10 admin-created members per hour
    const rateLimitResult = await RateLimiters.adminCreateMember.check(user.id);
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

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const email = validateEmail(validateRequired(body.email, 'Email'));
    const fullName = validateRequired(body.full_name, 'Full name');
    const role = validateProviderRole(validateRequired(body.role, 'Role'));

    // Validate role assignment permissions
    if (role === 'owner' && membership.role !== 'owner') {
      throw APIErrors.FORBIDDEN('Only owners can assign the owner role');
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email)
      .single();

    if (existingUser) {
      throw APIErrors.CONFLICT('A user with this email already exists');
    }

    // Check if there's already a member or invitation with this email
    const { data: existingMember } = await supabase
      .from('provider_members')
      .select('id, user_id')
      .eq('provider_id', providerId)
      .eq('user_id', email)
      .single();

    if (existingMember) {
      throw APIErrors.CONFLICT('This user is already a member of this provider');
    }

    const { data: existingInvitation } = await supabase
      .from('provider_invitations')
      .select('id')
      .eq('provider_id', providerId)
      .eq('email', email)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      throw APIErrors.CONFLICT('There is already a pending invitation for this email');
    }

    // Get provider name and admin name for invitation email
    const { data: provider } = await supabase
      .from('providers')
      .select('name')
      .eq('id', providerId)
      .single();

    const providerName = provider?.name || 'the team';

    // Get admin name from current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const adminName = currentUser?.user_metadata?.full_name || user.email || 'An administrator';

    // Create user account and send welcome email
    let newUser;
    try {
      newUser = await inviteTeamMember(email, {
        full_name: fullName,
        role,
        provider_id: providerId,
        provider_name: providerName,
        admin_name: adminName,
      });
    } catch (error) {
      console.error('Error inviting team member:', error);
      throw APIErrors.INTERNAL('Failed to create user account and send invitation');
    }

    // Create provider membership with pending status
    const { data: newMember, error: memberError } = await supabase
      .from('provider_members')
      .insert({
        provider_id: providerId,
        user_id: newUser.userId,
        role: role as ProviderRole,
        status: 'pending',
        invitation_method: 'admin_created',
        invited_by: user.id,
      })
      .select('id, provider_id, user_id, role, status, invitation_method, created_at')
      .single();

    if (memberError) {
      console.error('Error creating provider membership:', memberError);
      throw APIErrors.INTERNAL('Failed to create provider membership');
    }

    // Audit log: Record admin-created member
    await AuditLogger.log({
      providerId,
      userId: user.id,
      action: 'member_admin_created',
      resourceType: 'member',
      resourceId: newMember.id,
      details: {
        targetUserId: newUser.userId,
        targetEmail: email,
        targetFullName: fullName,
        assignedRole: role,
        invitationMethod: 'admin_created',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return success with masked email for security
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    return NextResponse.json(
      {
        data: {
          id: newMember.id,
          email: maskedEmail,
          full_name: fullName,
          role: newMember.role,
          status: newMember.status,
          invitation_method: newMember.invitation_method,
          created_at: newMember.created_at,
        },
        message: `Team member added successfully. Welcome email sent to ${maskedEmail}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

