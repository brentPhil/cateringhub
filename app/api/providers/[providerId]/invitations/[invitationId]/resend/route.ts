/**
 * Resend Invitation API
 * POST /api/providers/[providerId]/invitations/[invitationId]/resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requireProviderRole, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';
import { generateSecureToken, generateTokenExpiration } from '@/lib/api/tokens';
import { sendInvitationEmail } from '@/lib/email/service';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RateLimiters, createRateLimitError } from '@/lib/middleware/rate-limit';

interface RouteContext {
  params: Promise<{ providerId: string; invitationId: string }>;
}

/**
 * POST /api/providers/[providerId]/invitations/[invitationId]/resend
 * Resend an invitation with a new token
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get and validate parameters
    const { providerId, invitationId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(invitationId, 'Invitation ID');

    // Authenticate user
    const user = await getAuthenticatedUser();

    // Rate limiting: Check if user has exceeded resend limit for this invitation
    const rateLimitResult = await RateLimiters.resendInvitation.check(invitationId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Check user has admin or owner role
    await requireProviderRole(providerId, user.id, 'admin');

    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('provider_invitations')
      .select('id, provider_id, email, role, accepted_at, expires_at')
      .eq('id', invitationId)
      .eq('provider_id', providerId)
      .single();

    if (invitationError || !invitation) {
      throw APIErrors.NOT_FOUND('Invitation');
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      throw APIErrors.INVALID_INPUT(
        'This invitation has already been accepted and cannot be resent'
      );
    }

    // Generate new token and expiration
    const newToken = generateSecureToken(32);
    const newExpiresAt = generateTokenExpiration(48);

    // Update invitation with new token and expiration
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('provider_invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select('id, email, role, expires_at, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      throw APIErrors.INTERNAL('Failed to resend invitation');
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

    // Send new invitation email
    try {
      await sendInvitationEmail(
        invitation.email,
        providerName,
        invitation.role,
        inviterName,
        newToken
      );
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    // Audit log: Record invitation resent
    await AuditLogger.logInvitation({
      providerId,
      userId: user.id,
      actionType: 'invitation_resent',
      metadata: {
        invitationId,
        email: invitation.email,
        role: invitation.role,
        previousExpiration: invitation.expires_at,
        newExpiration: newExpiresAt,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return updated invitation details (without token)
    return NextResponse.json(
      {
        data: updatedInvitation,
        message: 'Invitation resent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

