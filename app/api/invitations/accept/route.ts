/**
 * Accept Invitation API
 * POST /api/invitations/accept - Accept a provider team invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { parseRequestBody, validateAcceptInvitationRequest } from '@/lib/api/validation';
import { isTokenExpired } from '@/lib/api/tokens';

/**
 * POST /api/invitations/accept
 * Accept an invitation and create provider membership
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    // Parse and validate request body
    const body = await parseRequestBody(request);
    const { token } = validateAcceptInvitationRequest(body);

    const supabase = await createClient();

    // Find invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('provider_invitations')
      .select('id, provider_id, email, role, expires_at, accepted_at, invited_by')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      throw APIErrors.GONE('Invalid or expired invitation token');
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      throw APIErrors.GONE('This invitation has already been accepted');
    }

    // Check if invitation has expired
    if (isTokenExpired(invitation.expires_at)) {
      throw APIErrors.GONE('This invitation has expired. Please request a new invitation.');
    }

    // Verify email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw APIErrors.FORBIDDEN(
        'This invitation was sent to a different email address. Please log in with the correct account.'
      );
    }

    // Check if user is already a member of this provider
    const { data: existingMember } = await supabase
      .from('provider_members')
      .select('id, status, role')
      .eq('provider_id', invitation.provider_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        // Update invitation as accepted even though they're already a member
        await supabase
          .from('provider_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        throw APIErrors.CONFLICT('You are already a member of this provider');
      } else if (existingMember.status === 'suspended') {
        throw APIErrors.FORBIDDEN(
          'Your membership has been suspended. Please contact the provider owner.'
        );
      }
    }

    // Use a transaction-like approach: create membership and update invitation
    // Create provider membership
    const { data: newMember, error: memberError } = await supabase
      .from('provider_members')
      .insert({
        provider_id: invitation.provider_id,
        user_id: user.id,
        role: invitation.role,
        status: 'active',
        invited_by: invitation.invited_by,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .select('id, provider_id, user_id, role, status, joined_at')
      .single();

    if (memberError) {
      console.error('Error creating provider member:', memberError);
      throw APIErrors.INTERNAL('Failed to create membership');
    }

    // Update invitation as accepted
    const { error: updateError } = await supabase
      .from('provider_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the request, membership was created successfully
    }

    // Get provider details
    const { data: provider } = await supabase
      .from('providers')
      .select('id, name, description')
      .eq('id', invitation.provider_id)
      .single();

    // Return success with provider and membership details
    return NextResponse.json(
      {
        data: {
          provider: provider || { id: invitation.provider_id },
          membership: newMember,
        },
        message: 'Invitation accepted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

