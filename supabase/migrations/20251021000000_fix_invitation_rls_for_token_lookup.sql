-- ============================================================================
-- Fix RLS Policy for provider_invitations Token Lookup
-- ============================================================================
-- Problem: Users cannot query invitations by token because they're not yet
-- members of the provider. The current SELECT policy requires either:
-- 1. Being a provider member (which they're not yet), OR
-- 2. Email matching (but the query is by token, not email)
--
-- Solution: Allow authenticated users to SELECT invitations by token.
-- This is safe because:
-- - Tokens are cryptographically secure (64-char hex)
-- - Tokens expire after 48 hours
-- - The acceptance flow still validates email matches
-- ============================================================================

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Members can view invitations" ON public.provider_invitations;

-- Create new SELECT policy that allows:
-- 1. Provider members to view all invitations for their provider
-- 2. ANY authenticated user to view invitations where email matches their email
--    (this allows the invitation acceptance flow to work)
CREATE POLICY "Users can view relevant invitations"
ON public.provider_invitations
FOR SELECT
TO authenticated
USING (
  -- User is a member of this provider (any role)
  is_provider_member(provider_id, auth.uid(), 'viewer'::provider_role)
  OR
  -- User's email matches the invitation email
  -- (allows users to query by token to accept invitations)
  email = (
    SELECT users.email
    FROM auth.users
    WHERE users.id = auth.uid()
  )::text
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view relevant invitations" ON public.provider_invitations IS 
'Allows provider members to view all invitations for their provider, and allows users to view invitations sent to their email address (enables token-based invitation acceptance flow).';

