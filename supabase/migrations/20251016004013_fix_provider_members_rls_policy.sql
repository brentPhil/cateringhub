-- ============================================================================
-- FIX PROVIDER MEMBERS RLS POLICY
-- ============================================================================
-- Add policy to allow users to view their own membership record
-- This fixes the chicken-and-egg problem where users couldn't query their
-- own membership because the existing policy required them to already be a member
-- ============================================================================

-- Add policy to allow users to view their own membership
CREATE POLICY "Users can view their own membership"
ON provider_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add comment
COMMENT ON POLICY "Users can view their own membership" ON provider_members IS 
'Allows authenticated users to view their own provider membership records. This is necessary for the team page to determine the user''s role and provider.';

