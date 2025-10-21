/**
 * Accept Invitation API
 * POST /api/invitations/accept - Accept a provider team invitation
 *
 * Security Architecture:
 * - Uses admin client ONLY for initial invitation lookup by token
 *   (server-side RLS context doesn't work reliably with SSR cookies)
 * - Uses RPC function with SECURITY DEFINER for membership operations
 *   (provides defense in depth and encapsulates business logic)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    // Use admin client ONLY for invitation lookup by token
    // This is necessary because server-side RLS context doesn't work reliably
    // with SSR cookie-based authentication
    const adminClient = createAdminClient();

    // Find invitation by token
    const { data: invitation, error: invitationError } = await adminClient
      .from('provider_invitations')
      .select('id, provider_id, email, role, expires_at, accepted_at, invited_by')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      throw APIErrors.GONE('Invalid or expired invitation token');
    }

    // Validate invitation
    if (invitation.accepted_at) {
      throw APIErrors.GONE('This invitation has already been accepted');
    }

    if (isTokenExpired(invitation.expires_at)) {
      throw APIErrors.GONE('This invitation has expired. Please request a new invitation.');
    }

    // Verify email matches (case-insensitive)
    // Following OWASP best practices: use generic error message to prevent account enumeration
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw APIErrors.FORBIDDEN(
        'This invitation is not valid for your account. Please sign out and sign in with the correct account, or contact the team administrator.'
      );
    }

    // Use RPC function to accept invitation and create membership
    // This function uses SECURITY DEFINER to bypass RLS for membership creation
    // while keeping the business logic encapsulated in the database
    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
      p_invitation_id: invitation.id,
      p_user_id: user.id,
    });

    if (rpcError) {
      // Handle specific error cases from the RPC function
      const errorMessage = rpcError.message || '';

      if (errorMessage.includes('already an active member')) {
        throw APIErrors.CONFLICT('You are already a member of this provider');
      } else if (errorMessage.includes('suspended')) {
        throw APIErrors.FORBIDDEN(
          'Your membership has been suspended. Please contact the provider owner.'
        );
      } else if (errorMessage.includes('already accepted')) {
        throw APIErrors.GONE('This invitation has already been accepted');
      } else {
        console.error('Error accepting invitation:', rpcError);
        throw APIErrors.INTERNAL('Failed to accept invitation');
      }
    }

    // Return success with provider and membership details
    return NextResponse.json(
      {
        data,
        message: 'Invitation accepted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

