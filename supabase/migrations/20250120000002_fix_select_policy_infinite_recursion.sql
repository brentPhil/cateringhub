-- ============================================================================
-- FIX SELECT POLICY INFINITE RECURSION
-- ============================================================================
-- The SELECT policy on provider_members is causing infinite recursion because
-- it queries the same table it's protecting. We need to use a SECURITY DEFINER
-- function to bypass RLS and prevent the recursion.
-- ============================================================================

-- Create SECURITY DEFINER function to get user's provider IDs
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_provider_ids(p_user_id UUID)
RETURNS TABLE(provider_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pm.provider_id
  FROM public.provider_members pm
  WHERE pm.user_id = p_user_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_user_provider_ids IS 
'Security definer function to get all provider IDs for a user. Bypasses RLS to prevent infinite recursion in SELECT policies.';

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Members can view their provider members" ON public.provider_members;

-- Create new SELECT policy using the security definer function
CREATE POLICY "Members can view their provider members"
ON public.provider_members
FOR SELECT
TO authenticated
USING (
  -- User can view members of providers they belong to
  provider_id IN (
    SELECT get_user_provider_ids.provider_id
    FROM public.get_user_provider_ids(auth.uid())
  )
);

-- Add comment
COMMENT ON POLICY "Members can view their provider members" ON public.provider_members IS 
'Allows users to view all members of providers they belong to. Uses security definer function to prevent RLS recursion.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_provider_ids(UUID) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.get_user_provider_ids(UUID) FROM public;

