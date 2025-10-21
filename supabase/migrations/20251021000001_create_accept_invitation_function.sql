-- ============================================================================
-- Create accept_invitation RPC Function
-- ============================================================================
-- This function handles the entire invitation acceptance flow using
-- SECURITY DEFINER to bypass RLS for the chicken-and-egg problem where
-- users need to create membership records but RLS requires them to be
-- members first.
--
-- Security considerations:
-- - Function is SECURITY DEFINER (runs with creator's privileges)
-- - All business logic validation is done within the function
-- - Only called from authenticated API route after token validation
-- - Prevents direct abuse by requiring invitation_id (not token)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_existing_member RECORD;
  v_new_member RECORD;
  v_provider RECORD;
BEGIN
  -- Get invitation details
  SELECT 
    id,
    provider_id,
    email,
    role,
    invited_by,
    accepted_at
  INTO v_invitation
  FROM provider_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Check if invitation has already been accepted
  IF v_invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;

  -- Check if user is already a member of this provider
  SELECT 
    id,
    status,
    role
  INTO v_existing_member
  FROM provider_members
  WHERE provider_id = v_invitation.provider_id
    AND user_id = p_user_id;

  IF FOUND THEN
    IF v_existing_member.status = 'active' THEN
      -- Update invitation as accepted even though user is already a member
      UPDATE provider_invitations
      SET accepted_at = NOW()
      WHERE id = p_invitation_id;
      
      RAISE EXCEPTION 'User is already an active member of this provider';
    ELSIF v_existing_member.status = 'suspended' THEN
      RAISE EXCEPTION 'User membership is suspended';
    ELSIF v_existing_member.status = 'pending' THEN
      -- User has a pending membership (e.g., from admin creation)
      -- Activate it and update the role to match the invitation
      UPDATE provider_members
      SET 
        status = 'active',
        role = v_invitation.role,
        invitation_method = 'email_invite',
        joined_at = NOW()
      WHERE id = v_existing_member.id
      RETURNING * INTO v_new_member;

      -- Update invitation as accepted
      UPDATE provider_invitations
      SET accepted_at = NOW()
      WHERE id = p_invitation_id;
    END IF;
  ELSE
    -- Create new membership
    INSERT INTO provider_members (
      provider_id,
      user_id,
      role,
      status,
      invitation_method,
      invited_by,
      invited_at,
      joined_at
    ) VALUES (
      v_invitation.provider_id,
      p_user_id,
      v_invitation.role,
      'active',
      'email_invite',
      v_invitation.invited_by,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_new_member;

    -- Update invitation as accepted
    UPDATE provider_invitations
    SET accepted_at = NOW()
    WHERE id = p_invitation_id;
  END IF;

  -- Get provider details
  SELECT 
    id,
    name,
    description
  INTO v_provider
  FROM providers
  WHERE id = v_invitation.provider_id;

  -- Return result as JSON
  RETURN json_build_object(
    'provider', row_to_json(v_provider),
    'membership', row_to_json(v_new_member)
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.accept_invitation IS 
'Accepts an invitation and creates or activates provider membership. Uses SECURITY DEFINER to bypass RLS for the chicken-and-egg problem where users need to create membership records but RLS requires them to be members first. Should only be called from the authenticated API route after proper token and email validation.';

