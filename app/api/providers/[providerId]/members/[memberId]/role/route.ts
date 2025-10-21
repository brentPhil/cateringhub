/**
 * Member Role API
 * PATCH /api/providers/[providerId]/members/[memberId]/role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateUUID } from '@/lib/api/validation';
import type { Database } from '@/database.types';

type ProviderRole = Database['public']['Enums']['provider_role'];

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

const VALID_ROLES: ProviderRole[] = ['owner', 'admin', 'manager', 'staff', 'viewer'];

/**
 * PATCH /api/providers/[providerId]/members/[memberId]/role
 * Update member role
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
      throw APIErrors.FORBIDDEN('You do not have permission to update member roles');
    }

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const { role } = body;

    if (!role || typeof role !== 'string') {
      throw APIErrors.INVALID_INPUT('Role is required');
    }

    if (!VALID_ROLES.includes(role as ProviderRole)) {
      throw APIErrors.INVALID_INPUT(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

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

    // Prevent changing owner role
    if (targetMember.role === 'owner') {
      throw APIErrors.INVALID_INPUT('Cannot change the role of an owner');
    }

    // Prevent non-owners from assigning owner role
    if (role === 'owner' && currentMember.role !== 'owner') {
      throw APIErrors.FORBIDDEN('Only owners can assign the owner role');
    }

    // Prevent users from changing their own role
    if (targetMember.user_id === user.id) {
      throw APIErrors.INVALID_INPUT('You cannot change your own role');
    }

    // Check if role is already set to the requested value
    if (targetMember.role === role) {
      return NextResponse.json(
        {
          data: targetMember,
          message: `Member already has the ${role} role`,
        },
        { status: 200 }
      );
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('provider_members')
      .update({
        role: role as ProviderRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select('id, provider_id, user_id, role, status, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating member role:', updateError);
      throw APIErrors.INTERNAL('Failed to update member role');
    }

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        provider_id: providerId,
        user_id: user.id,
        action: 'member_role_updated',
        resource_type: 'member',
        resource_id: memberId,
        details: {
          target_user_id: targetMember.user_id,
          previous_role: targetMember.role,
          new_role: role,
        },
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the request if audit log fails
    }

    return NextResponse.json(
      {
        data: updatedMember,
        message: `Member role updated to ${role} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

