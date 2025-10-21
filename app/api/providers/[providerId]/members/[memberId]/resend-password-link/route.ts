/**
 * POST /api/providers/[providerId]/members/[memberId]/resend-password-link
 * Resend welcome email for admin-created members
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { requireMembership } from '@/lib/api/membership';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';
import { inviteTeamMember, getUserById } from '@/lib/supabase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RateLimiters, createRateLimitError } from '@/lib/middleware/rate-limit';

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

/**
 * POST /api/providers/[providerId]/members/[memberId]/resend-password-link
 * Resend welcome email for admin-created member
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { providerId, memberId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(memberId, 'Member ID');

    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Require admin or owner role
    await requireMembership(providerId, ['owner', 'admin']);

    // Rate limiting: 3 resends per hour per member
    const rateLimitResult = await RateLimiters.resendPasswordLink.check(`${user.id}-${memberId}`);
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

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status, invitation_method')
      .eq('id', memberId)
      .eq('provider_id', providerId)
      .single();

    if (memberError || !member) {
      throw APIErrors.NOT_FOUND('Member not found');
    }

    // Verify this is an admin-created member
    if (member.invitation_method !== 'admin_created') {
      throw APIErrors.INVALID_INPUT(
        'Welcome emails can only be resent for admin-created members'
      );
    }

    // Verify member is still pending (hasn't logged in yet)
    if (member.status !== 'pending') {
      throw APIErrors.INVALID_INPUT(
        'Welcome email can only be resent for pending members who haven\'t logged in yet'
      );
    }

    // Get user details from auth
    let targetUser;
    try {
      targetUser = await getUserById(member.user_id);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw APIErrors.NOT_FOUND('User account not found');
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

    // Resend welcome email
    // Note: This creates a new user account if one doesn't exist (idempotent)
    try {
      await inviteTeamMember(targetUser.email, {
        full_name: (targetUser.user_metadata.full_name as string) || targetUser.email,
        role: member.role,
        provider_id: providerId,
        provider_name: providerName,
        admin_name: adminName,
      });
    } catch (error) {
      console.error('Error resending welcome email:', error);
      throw APIErrors.INTERNAL('Failed to resend welcome email');
    }

    // Audit log: Record welcome email resent
    await AuditLogger.log({
      providerId,
      userId: user.id,
      action: 'welcome_email_resent',
      resourceType: 'member',
      resourceId: memberId,
      details: {
        targetUserId: member.user_id,
        targetEmail: targetUser.email,
        memberRole: member.role,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Return success with masked email
    const maskedEmail = targetUser.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    return NextResponse.json(
      {
        data: {
          id: member.id,
          email: maskedEmail,
        },
        message: `Welcome email resent to ${maskedEmail}`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

