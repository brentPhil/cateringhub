/**
 * Member Status API
 * PATCH /api/providers/[providerId]/members/[memberId]/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists, hasHigherOrEqualRole } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateUpdateMemberStatusRequest, validateUUID } from '@/lib/api/validation';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { RateLimiters, createRateLimitError } from '@/lib/middleware/rate-limit';
import type { Database } from '@/database.types';

type ProviderRole = Database['public']['Enums']['provider_role'];
type MemberStatus = Database['public']['Enums']['provider_member_status'];

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

/**
 * PATCH /api/providers/[providerId]/members/[memberId]/status
 * Update member status (suspend/activate)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get and validate parameters
    const { providerId, memberId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(memberId, 'Member ID');

    // Authenticate user
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Rate limiting: Check if user has exceeded status change limit
    const rateLimitResult = await RateLimiters.memberStatusChanges.check(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Check user has admin or owner role - query directly
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status')
      .eq('provider_id', providerId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember) {
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

    if (roleHierarchy[currentMember.role] > roleHierarchy['admin']) {
      throw APIErrors.FORBIDDEN('You do not have permission to update member status');
    }

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const { status } = validateUpdateMemberStatusRequest(body);

    // Get target member details
    const { data: targetMember, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status')
      .eq('id', memberId)
      .eq('provider_id', providerId)
      .single();

    if (memberError || !targetMember) {
      throw APIErrors.NOT_FOUND('Member');
    }

    // Prevent owners from suspending themselves
    if (targetMember.user_id === user.id && targetMember.role === 'owner') {
      throw APIErrors.INVALID_INPUT('Owners cannot suspend themselves');
    }

    // Prevent non-owners from suspending owners
    if (targetMember.role === 'owner' && currentMember.role !== 'owner') {
      throw APIErrors.FORBIDDEN('Only owners can suspend other owners');
    }

    // Prevent admins from suspending other admins or higher roles
    if (currentMember.role === 'admin') {
      if (!hasHigherOrEqualRole(currentMember.role as ProviderRole, targetMember.role as ProviderRole)) {
        throw APIErrors.FORBIDDEN('You cannot suspend members with equal or higher roles');
      }
    }

    // Check if status is already set to the requested value
    if (targetMember.status === status) {
      return NextResponse.json(
        {
          data: targetMember,
          message: `Member is already ${status}`,
        },
        { status: 200 }
      );
    }

    // Update member status
    const { data: updatedMember, error: updateError } = await supabase
      .from('provider_members')
      .update({
        status: status as MemberStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select('id, provider_id, user_id, role, status, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating member status:', updateError);
      throw APIErrors.INTERNAL('Failed to update member status');
    }

    // Audit log: Record status change
    await AuditLogger.logSuspension({
      providerId,
      userId: user.id,
      actionType: status === 'suspended' ? 'member_suspended' : 'member_activated',
      metadata: {
        targetUserId: targetMember.user_id,
        targetMemberId: memberId,
        previousStatus: targetMember.status,
        newStatus: status,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        data: updatedMember,
        message: `Member ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

