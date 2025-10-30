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

    // Check user has manager or above role
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

    // Check if user has manager or above role
    const roleHierarchy: Record<string, number> = {
      owner: 1,
      admin: 2,
      manager: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[currentMember.role] > roleHierarchy['manager']) {
      throw APIErrors.FORBIDDEN('You do not have permission to assign team members');
    }

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
      .select('id, provider_id, user_id, team_id, status')
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

