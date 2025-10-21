-- ============================================================================
-- Fix RLS Performance for provider_invitations
-- ============================================================================
-- Issue: The policy "Users can view relevant invitations" calls auth.uid()
-- multiple times per row, causing performance issues at scale.
--
-- Solution: Wrap auth.uid() in subqueries to ensure it's evaluated once.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.provider_invitations;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view relevant invitations"
ON public.provider_invitations
FOR SELECT
TO authenticated
USING (
  -- User is a member of this provider (any role)
  is_provider_member(provider_id, (SELECT auth.uid()), 'viewer'::provider_role)
  OR
  -- User's email matches the invitation email
  -- (allows users to query by token to accept invitations)
  email = (
    SELECT users.email
    FROM auth.users
    WHERE users.id = (SELECT auth.uid())
  )::text
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view relevant invitations" ON public.provider_invitations IS 
'Allows provider members to view all invitations for their provider, and allows users to view invitations sent to their email address (enables token-based invitation acceptance flow). Optimized to prevent auth.uid() re-evaluation per row.';

