/**
 * Member Management API
 * DELETE /api/providers/[providerId]/members/[memberId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID, parseRequestBody } from '@/lib/api/validation';

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

/**
 * DELETE /api/providers/[providerId]/members/[memberId]
 * Permanently delete a member from the provider team (hard delete)
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
      supervisor: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[currentMember.role] > roleHierarchy['admin']) {
      throw APIErrors.FORBIDDEN('You do not have permission to remove members');
    }

    // Get target member details
    const { data: targetMember, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status, team_id')
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

    // Prevent deleting the last supervisor from a team (friendly check)
    if (targetMember.role === 'supervisor' && targetMember.team_id) {
      const { count: otherSupervisorsCount, error: supErr } = await supabase
        .from('provider_members')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('team_id', targetMember.team_id)
        .eq('role', 'supervisor')
        .eq('status', 'active')
        .neq('id', targetMember.id);

      if (supErr) {
        throw APIErrors.INTERNAL('Failed to verify team supervisors');
      }

      if ((otherSupervisorsCount as unknown as number) === 0) {
        throw APIErrors.INVALID_INPUT(
          'Cannot remove the last supervisor from this team. Assign another supervisor first.'
        );
      }
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

    // Hard delete: remove the provider_members row
    const { error: hardDeleteError } = await supabase
      .from('provider_members')
      .delete()
      .eq('id', memberId)
      .eq('provider_id', providerId);

    if (hardDeleteError) {
      console.error('Error deleting member:', hardDeleteError);
      const msg = (hardDeleteError as unknown as { message?: string })?.message || '';
      if (msg.toLowerCase().includes('last supervisor')) {
        return NextResponse.json(
          { error: { message: 'Cannot remove the last supervisor from this team. Assign another supervisor first.' } },
          { status: 400 }
        );
      }
      throw APIErrors.INTERNAL('Failed to delete member');
    }

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        provider_id: providerId,
        user_id: user.id,
        action: 'member_deleted',
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
        message: 'Member permanently deleted',
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

/**
 * PATCH /api/providers/[providerId]/members/[memberId]
 * Atomically update member properties (role and/or team_id)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Params
    const { providerId, memberId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(memberId, 'Member ID');

    // Auth + client
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Provider guard (friendly 404)
    await verifyProviderExists(providerId);

    // Parse body
    const body = await parseRequestBody(request);
    const role = typeof body.role === 'string' ? body.role : undefined;
    const team_id = body.team_id === undefined ? undefined : (body.team_id || null);

    if (role === undefined && team_id === undefined) {
      throw APIErrors.INVALID_INPUT('Provide at least one field to update (role or team_id)');
    }

    // Fetch target (for no-op detection and self-role guard)
    const { data: targetMember, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status, team_id')
      .eq('id', memberId)
      .eq('provider_id', providerId)
      .single();

    if (memberError || !targetMember) {
      throw APIErrors.NOT_FOUND('Member');
    }

    // Prevent changing an owner's role
    if (role !== undefined && targetMember.role === 'owner' && role !== targetMember.role) {
      throw APIErrors.INVALID_INPUT('Cannot change the role of an owner');
    }

    // Prevent changing your own role
    if (role !== undefined && targetMember.user_id === user.id) {
      throw APIErrors.INVALID_INPUT('You cannot change your own role');
    }

    // If assigning to a team, verify team exists and is active in this provider
    if (team_id !== undefined && team_id !== null) {
      validateUUID(team_id, 'Team ID');
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, provider_id, status')
        .eq('id', team_id)
        .eq('provider_id', providerId)
        .single();

      if (teamError || !team) {
        throw APIErrors.NOT_FOUND('Team');
      }
      if (team.status !== 'active') {
        throw APIErrors.INVALID_INPUT('Cannot assign members to an inactive or archived team');
      }
    }

    // No-op early return
    const noRoleChange = role === undefined || role === targetMember.role;
    const noTeamChange = team_id === undefined || team_id === targetMember.team_id;
    if (noRoleChange && noTeamChange) {
      return NextResponse.json(
        { data: targetMember, message: 'No changes to update' },
        { status: 200 }
      );
    }

    // Build updates atomically
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (team_id !== undefined) updates.team_id = team_id;

    // Perform update atomically
    const { data: updatedMember, error: updateError } = await supabase
      .from('provider_members')
      .update(updates)
      .eq('id', memberId)
      .select('id, provider_id, user_id, role, status, team_id, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating member:', updateError);
      const msg = (updateError as unknown as { message?: string })?.message?.toLowerCase() || '';
      if (msg.includes('last supervisor')) {
        return NextResponse.json(
          { error: { message: 'Cannot remove the last supervisor from this team. Assign another supervisor first.' } },
          { status: 400 }
        );
      }
      if (msg.includes('supervisor') && msg.includes('team')) {
        return NextResponse.json(
          { error: { message: 'Assign this member to a team before promoting to supervisor.' } },
          { status: 400 }
        );
      }
      if (msg.includes('owner') && msg.includes('policy')) {
        return NextResponse.json(
          { error: { message: 'Only owners can assign the owner role.' } },
          { status: 403 }
        );
      }
      throw APIErrors.INTERNAL('Failed to update member');
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        provider_id: providerId,
        user_id: user.id,
        action: 'member_updated',
        resource_type: 'member',
        resource_id: memberId,
        details: {
          previous_role: targetMember.role,
          new_role: role ?? targetMember.role,
          previous_team_id: targetMember.team_id,
          new_team_id: team_id ?? targetMember.team_id,
        },
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    const changed: string[] = [];
    if (!noRoleChange) changed.push('role');
    if (!noTeamChange) changed.push('team');
    const message = changed.length > 0 ? `Member ${changed.join(' & ')} updated successfully` : 'Member updated';

    return NextResponse.json(
      { data: updatedMember, message },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
