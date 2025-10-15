/**
 * Member Management API
 * DELETE /api/providers/[providerId]/members/[memberId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

/**
 * DELETE /api/providers/[providerId]/members/[memberId]
 * Remove a member from the provider team
 */
export async function DELETE(
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
      throw APIErrors.FORBIDDEN('You do not have permission to remove members');
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

    // Prevent owners from removing themselves
    if (targetMember.user_id === user.id && targetMember.role === 'owner') {
      throw APIErrors.INVALID_INPUT('Owners cannot remove themselves');
    }

    // Check if this is the last owner
    if (targetMember.role === 'owner') {
      const { data: ownerCount, error: countError } = await supabase
        .from('provider_members')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('role', 'owner')
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting owners:', countError);
        throw APIErrors.INTERNAL('Failed to verify owner count');
      }

      if ((ownerCount as unknown as number) <= 1) {
        throw APIErrors.INVALID_INPUT(
          'Cannot remove the last owner. Please transfer ownership first.'
        );
      }
    }

    // Prevent non-owners from removing owners
    if (targetMember.role === 'owner' && currentMember.role !== 'owner') {
      throw APIErrors.FORBIDDEN('Only owners can remove other owners');
    }

    // Get all bookings assigned to this member
    const { data: assignedBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', providerId)
      .eq('assigned_to', targetMember.user_id);

    // Reassign bookings to the current user (or find an owner/admin as fallback)
    if (assignedBookings && assignedBookings.length > 0) {
      let reassignTo = user.id;

      // If current user is the one being removed, find another admin or owner
      if (targetMember.user_id === user.id) {
        const { data: fallbackMember } = await supabase
          .from('provider_members')
          .select('user_id')
          .eq('provider_id', providerId)
          .in('role', ['owner', 'admin'])
          .eq('status', 'active')
          .neq('user_id', user.id)
          .limit(1)
          .single();

        if (fallbackMember) {
          reassignTo = fallbackMember.user_id;
        }
      }

      // Reassign all bookings
      const { error: reassignError } = await supabase
        .from('bookings')
        .update({ assigned_to: reassignTo })
        .eq('provider_id', providerId)
        .eq('assigned_to', targetMember.user_id);

      if (reassignError) {
        console.error('Error reassigning bookings:', reassignError);
        throw APIErrors.INTERNAL('Failed to reassign bookings');
      }
    }

    // Soft delete: Update status to 'suspended' and add a deleted_at timestamp
    // We'll use the updated_at field to track when they were removed
    // Note: We could add a deleted_at column in a future migration
    const { error: deleteError } = await supabase
      .from('provider_members')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      throw APIErrors.INTERNAL('Failed to remove member');
    }

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        provider_id: providerId,
        user_id: user.id,
        action: 'member_removed',
        resource_type: 'member',
        resource_id: memberId,
        details: {
          target_user_id: targetMember.user_id,
          role: targetMember.role,
          bookings_reassigned: assignedBookings?.length || 0,
        },
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the request if audit log fails
    }

    return NextResponse.json(
      {
        message: 'Member removed successfully',
        data: {
          removed_member_id: memberId,
          bookings_reassigned: assignedBookings?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

