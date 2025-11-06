/**
 * Member Team Assignment API
 * PATCH /api/providers/[providerId]/members/[memberId]/team
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, verifyProviderExists } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateUUID } from '@/lib/api/validation';

interface RouteContext {
  params: Promise<{ providerId: string; memberId: string }>;
}

/**
 * PATCH /api/providers/[providerId]/members/[memberId]/team
 * Assign or remove member from a team
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

    // Check user has admin/owner role or supervisor (team-scoped)
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status, team_id')
      .eq('provider_id', providerId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (currentMemberError || !currentMember) {
      throw APIErrors.FORBIDDEN('You are not an active member of this provider');
    }

    // Determine permissions
    const isOwnerOrAdmin = currentMember.role === 'owner' || currentMember.role === 'admin';

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const { team_id } = body as { team_id?: string | null };

    // team_id can be null (to remove from team) or a valid UUID
    if (team_id !== null && team_id !== undefined) {
      validateUUID(team_id, 'Team ID');
    }

    // Get target member details
    const { data: targetMember, error: memberError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, team_id, status')
      .eq('id', memberId)
      .eq('provider_id', providerId)
      .single();

    if (memberError || !targetMember) {
      throw APIErrors.NOT_FOUND('Member');
    }

    // If team_id is provided, verify it exists and belongs to this provider
    if (team_id) {
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

    // If removing/moving a supervisor, ensure they are not the last supervisor of the team
    if (
      targetMember.role === 'supervisor' &&
      targetMember.team_id &&
      (team_id === null || team_id === undefined || team_id !== targetMember.team_id)
    ) {
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
        return NextResponse.json(
          {
            error: {
              message:
                'Cannot remove the last supervisor from this team. Assign another supervisor first.',
            },
          },
          { status: 400 }
        );
      }
    }

    // Enforce supervisor's team-scoped permission: supervisors can only manage staff within their own team
    if (!isOwnerOrAdmin && currentMember.role === 'supervisor') {
      // Only allow changes for staff members
      if (targetMember.role !== 'staff') {
        throw APIErrors.FORBIDDEN('Supervisors can only manage staff assignments');
      }
      // Only allow assigning to their own team or removing from their own team
      const supTeamId = currentMember.team_id;
      const isAssigningToOwnTeam = !!team_id && supTeamId && team_id === supTeamId;
      const isRemovingFromOwnTeam = (team_id === null || team_id === undefined) && targetMember.team_id === supTeamId;
      if (!isAssigningToOwnTeam && !isRemovingFromOwnTeam) {
        throw APIErrors.FORBIDDEN('Supervisors can only assign staff to their own team or remove them from it');
      }
    }

    // Check if team assignment is already set to the requested value
    if (targetMember.team_id === team_id) {
      const message = team_id 
        ? 'Member is already assigned to this team'
        : 'Member is already not assigned to any team';
      
      return NextResponse.json(
        {
          data: targetMember,
          message,
        },
        { status: 200 }
      );
    }

    // Update member team assignment
    const { data: updatedMember, error: updateError } = await supabase
      .from('provider_members')
      .update({
        team_id: team_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select('id, provider_id, user_id, team_id, status, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating member team assignment:', updateError);
      const msg = (updateError as unknown as { message?: string })?.message || '';
      if (msg.toLowerCase().includes('last supervisor')) {
        return NextResponse.json(
          {
            error: {
              message:
                'Cannot remove the last supervisor from this team. Assign another supervisor first.',
            },
          },
          { status: 400 }
        );
      }
      throw APIErrors.INTERNAL('Failed to update member team assignment');
    }

    // Create audit log entry
    try {
      await supabase.from('audit_logs').insert({
        provider_id: providerId,
        user_id: user.id,
        action: 'member_team_updated',
        resource_type: 'member',
        resource_id: memberId,
        details: {
          target_user_id: targetMember.user_id,
          previous_team_id: targetMember.team_id,
          new_team_id: team_id || null,
        },
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the request if audit log fails
    }

    const message = team_id
      ? 'Member assigned to team successfully'
      : 'Member removed from team successfully';

    return NextResponse.json(
      {
        data: updatedMember,
        message,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
