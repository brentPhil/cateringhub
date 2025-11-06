-- ============================================================================
-- CREATE SUPERVISOR HELPER FUNCTIONS
-- ============================================================================
-- Migration: 20251130000002_create_supervisor_helper_functions.sql
-- Date: November 30, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Create helper functions to support supervisor role and team-based access
--   control. These functions are used in RLS policies to enforce team-scoped
--   permissions for supervisors.
--
-- Functions:
--   1. is_team_supervisor(provider_id, user_id, team_id) - Check if user is supervisor of a team
--   2. get_user_supervised_teams(provider_id, user_id) - Get all teams user supervises
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 1: is_team_supervisor
-- ============================================================================
-- Checks if a user is a supervisor of a specific team
-- Returns TRUE if:
--   - User is an active member of the provider
--   - User has 'supervisor' role
--   - User is assigned to the specified team
-- Returns FALSE otherwise

CREATE OR REPLACE FUNCTION public.is_team_supervisor(
  p_provider_id UUID,
  p_user_id UUID,
  p_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_members pm
    WHERE pm.provider_id = p_provider_id
      AND pm.user_id = p_user_id
      AND pm.team_id = p_team_id
      AND pm.role = 'supervisor'
      AND pm.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_team_supervisor(UUID, UUID, UUID) IS 
'Checks if a user is an active supervisor of a specific team within a provider.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_team_supervisor(UUID, UUID, UUID) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.is_team_supervisor(UUID, UUID, UUID) FROM public;

-- ============================================================================
-- FUNCTION 2: get_user_supervised_teams
-- ============================================================================
-- Returns all team IDs that a user supervises within a provider
-- Returns empty array if user is not a supervisor or has no team assignments

CREATE OR REPLACE FUNCTION public.get_user_supervised_teams(
  p_provider_id UUID,
  p_user_id UUID
)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(team_id)
  FROM public.provider_members
  WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND role = 'supervisor'
    AND status = 'active'
    AND team_id IS NOT NULL;
$$;

COMMENT ON FUNCTION public.get_user_supervised_teams(UUID, UUID) IS 
'Returns array of team IDs that a user supervises within a provider. Returns NULL if no teams.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_supervised_teams(UUID, UUID) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.get_user_supervised_teams(UUID, UUID) FROM public;

-- ============================================================================
-- FUNCTION 3: can_user_manage_team_member
-- ============================================================================
-- Checks if a user can manage (view/edit/delete) a specific team member
-- Returns TRUE if:
--   - User is manager/admin/owner (provider-wide access)
--   - User is supervisor of the same team as the target member
-- Returns FALSE otherwise

CREATE OR REPLACE FUNCTION public.can_user_manage_team_member(
  p_provider_id UUID,
  p_user_id UUID,
  p_target_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_role provider_role;
  v_user_team_id UUID;
  v_target_team_id UUID;
BEGIN
  -- Get user's role and team
  SELECT role, team_id
  INTO v_user_role, v_user_team_id
  FROM public.provider_members
  WHERE provider_id = p_provider_id
    AND user_id = p_user_id
    AND status = 'active';
  
  -- If user is not an active member, return FALSE
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Managers, admins, and owners have provider-wide access
  IF v_user_role IN ('owner', 'admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- If user is not a supervisor, return FALSE
  IF v_user_role != 'supervisor' THEN
    RETURN FALSE;
  END IF;
  
  -- Get target member's team
  SELECT team_id
  INTO v_target_team_id
  FROM public.provider_members
  WHERE id = p_target_member_id;
  
  -- Supervisor can only manage members of their own team
  RETURN v_user_team_id IS NOT NULL 
    AND v_target_team_id IS NOT NULL 
    AND v_user_team_id = v_target_team_id;
END;
$$;

COMMENT ON FUNCTION public.can_user_manage_team_member(UUID, UUID, UUID) IS 
'Checks if a user can manage a specific team member. Managers+ have full access, supervisors can only manage their team members.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_manage_team_member(UUID, UUID, UUID) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.can_user_manage_team_member(UUID, UUID, UUID) FROM public;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these manually to verify migration)
-- ============================================================================

-- Test is_team_supervisor:
-- SELECT public.is_team_supervisor('provider-uuid', auth.uid(), 'team-uuid');

-- Test get_user_supervised_teams:
-- SELECT public.get_user_supervised_teams('provider-uuid', auth.uid());

-- Test can_user_manage_team_member:
-- SELECT public.can_user_manage_team_member('provider-uuid', auth.uid(), 'member-uuid');

-- List all functions created:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name IN ('is_team_supervisor', 'get_user_supervised_teams', 'can_user_manage_team_member')
-- ORDER BY routine_name;

