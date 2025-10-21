-- ============================================================================
-- UPDATE PROVIDER MEMBERS RLS POLICIES FOR ADMIN-CREATED MEMBERS
-- ============================================================================
-- This migration updates RLS policies to support the admin-created member flow
-- while maintaining security and preventing infinite recursion
-- ============================================================================

-- Drop existing problematic UPDATE policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins and owners can update member roles" ON public.provider_members;

-- Create SECURITY DEFINER function to check if user is provider admin
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_provider_admin(
  p_provider_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.provider_members
    WHERE provider_id = p_provider_id
      AND user_id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.is_provider_admin IS 
'Security definer function to check if a user is an admin or owner of a provider. Bypasses RLS to prevent infinite recursion in policies.';

-- ============================================================================
-- INSERT POLICY: Only admins and owners can create members
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Admins and owners can create members" ON public.provider_members;

-- Create new INSERT policy using the security definer function
CREATE POLICY "Admins and owners can create members"
ON public.provider_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be an admin or owner of the provider
  public.is_provider_admin(provider_id, auth.uid())
);

-- Add comment
COMMENT ON POLICY "Admins and owners can create members" ON public.provider_members IS 
'Allows only admins and owners to create new provider members. Uses security definer function to prevent RLS recursion.';

-- ============================================================================
-- UPDATE POLICY: Admins and owners can update member roles and status
-- ============================================================================

-- Create new UPDATE policy using the security definer function
CREATE POLICY "Admins and owners can update members"
ON public.provider_members
FOR UPDATE
TO authenticated
USING (
  -- User must be an admin or owner of the provider
  public.is_provider_admin(provider_id, auth.uid())
)
WITH CHECK (
  -- User must be an admin or owner of the provider
  public.is_provider_admin(provider_id, auth.uid())
);

-- Add comment
COMMENT ON POLICY "Admins and owners can update members" ON public.provider_members IS 
'Allows admins and owners to update provider members (role, status, etc.). Uses security definer function to prevent RLS recursion.';

-- ============================================================================
-- SELECT POLICY: Users can only view members from their own provider(s)
-- ============================================================================

-- The existing "Users can view their own membership" policy is sufficient
-- for users to view their own membership record

-- Drop existing SELECT policy for viewing provider members if it exists
DROP POLICY IF EXISTS "Members can view their provider members" ON public.provider_members;

-- Create new SELECT policy for viewing all members of user's provider
CREATE POLICY "Members can view their provider members"
ON public.provider_members
FOR SELECT
TO authenticated
USING (
  -- User is a member of this provider (any status, any role)
  provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON POLICY "Members can view their provider members" ON public.provider_members IS 
'Allows users to view all members of providers they belong to. This enables team pages to display all team members.';

-- ============================================================================
-- DELETE POLICY: Only admins and owners can remove members
-- ============================================================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Admins and owners can remove members" ON public.provider_members;

-- Create new DELETE policy using the security definer function
CREATE POLICY "Admins and owners can remove members"
ON public.provider_members
FOR DELETE
TO authenticated
USING (
  -- User must be an admin or owner of the provider
  public.is_provider_admin(provider_id, auth.uid())
);

-- Add comment
COMMENT ON POLICY "Admins and owners can remove members" ON public.provider_members IS 
'Allows only admins and owners to remove provider members. Uses security definer function to prevent RLS recursion.';

-- ============================================================================
-- GRANT EXECUTE PERMISSION ON SECURITY DEFINER FUNCTION
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_provider_admin(UUID, UUID) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.is_provider_admin(UUID, UUID) FROM public;

