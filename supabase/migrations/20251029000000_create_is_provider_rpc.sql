-- ============================================================================
-- CREATE is_provider RPC FUNCTION
-- ============================================================================
-- Migration: 20251029000000_create_is_provider_rpc.sql
-- Date: October 29, 2025
-- Purpose: Create an RPC function to check if the current user has any active
--          provider membership. This is used for authentication and authorization
--          checks throughout the application.
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION: is_provider
-- ============================================================================
-- Purpose: Check if the current authenticated user has any active provider membership
-- Parameters: None (uses auth.uid() to get current user)
-- Returns: BOOLEAN - true if user has active membership, false otherwise
-- Security: SECURITY DEFINER to bypass RLS for membership checks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has any active membership in provider_members
  RETURN EXISTS (
    SELECT 1
    FROM public.provider_members
    WHERE user_id = auth.uid()
      AND status = 'active'
  );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_provider() TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.is_provider() FROM public;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.is_provider IS
'Checks if the current authenticated user has any active provider membership.
Returns true if the user is an active member of at least one provider organization.
Uses SECURITY DEFINER to bypass RLS for membership checks.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '============================================================================';
RAISE NOTICE 'RPC FUNCTION CREATED SUCCESSFULLY!';
RAISE NOTICE '============================================================================';
RAISE NOTICE '';
RAISE NOTICE 'Function: public.is_provider()';
RAISE NOTICE 'Purpose: Check if user has active provider membership';
RAISE NOTICE 'Security: SECURITY DEFINER (bypasses RLS)';
RAISE NOTICE 'Returns: BOOLEAN';
RAISE NOTICE '';
RAISE NOTICE 'Usage:';
RAISE NOTICE '  SELECT is_provider(); -- Returns true/false';
RAISE NOTICE '';
RAISE NOTICE '============================================================================';

COMMIT;

