-- ============================================================================
-- Fix RLS Performance Warnings for provider_invitations
-- ============================================================================
-- Issues:
-- 1. Multiple permissive SELECT policies (performance issue)
-- 2. auth.uid() not wrapped in SELECT (causes re-evaluation per row)
--
-- Solution:
-- - Drop redundant "Users can view invitations sent to their email" policy
-- - Keep only "Users can view relevant invitations" (which covers both cases)
-- - Ensure all auth.uid() calls are wrapped in (SELECT auth.uid())
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP REDUNDANT SELECT POLICY
-- ============================================================================

-- Drop the redundant policy that only checks email
-- The "Users can view relevant invitations" policy already covers this case
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.provider_invitations;

-- ============================================================================
-- RECREATE OPTIMIZED POLICIES
-- ============================================================================

-- Drop and recreate "Users can view relevant invitations" with optimized auth.uid()
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.provider_invitations;

CREATE POLICY "Users can view relevant invitations"
ON public.provider_invitations
FOR SELECT
TO authenticated
USING (
  -- User is a member of this provider (any role)
  is_provider_member(provider_id, (SELECT auth.uid()), 'viewer'::provider_role)
  OR
  -- User's email matches the invitation email
  email = (
    SELECT users.email
    FROM auth.users
    WHERE users.id = (SELECT auth.uid())
  )::text
);

-- ============================================================================
-- FIX OTHER POLICIES TO USE OPTIMIZED auth.uid()
-- ============================================================================

-- Fix "Invited users can accept invitations" policy
DROP POLICY IF EXISTS "Invited users can accept invitations" ON public.provider_invitations;

CREATE POLICY "Invited users can accept invitations"
ON public.provider_invitations
FOR UPDATE
TO authenticated
USING (
  email = (
    SELECT users.email
    FROM auth.users
    WHERE users.id = (SELECT auth.uid())
  )::text
  AND accepted_at IS NULL
  AND expires_at > NOW()
)
WITH CHECK (
  email = (
    SELECT users.email
    FROM auth.users
    WHERE users.id = (SELECT auth.uid())
  )::text
);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view relevant invitations" ON public.provider_invitations IS 
'Allows provider members to view all invitations for their provider, and allows users to view invitations sent to their email address. Optimized to prevent auth.uid() re-evaluation per row.';

COMMENT ON POLICY "Invited users can accept invitations" ON public.provider_invitations IS 
'Allows users to accept invitations sent to their email address. Optimized to prevent auth.uid() re-evaluation per row.';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Verify only one SELECT policy exists
  IF (SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'provider_invitations' 
      AND schemaname = 'public' 
      AND cmd = 'SELECT') != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 SELECT policy on provider_invitations, found %', 
      (SELECT COUNT(*) FROM pg_policies 
       WHERE tablename = 'provider_invitations' 
       AND schemaname = 'public' 
       AND cmd = 'SELECT');
  END IF;
  
  RAISE NOTICE 'RLS policies optimized successfully for provider_invitations';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run:
--
-- BEGIN;
-- DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.provider_invitations;
-- DROP POLICY IF EXISTS "Invited users can accept invitations" ON public.provider_invitations;
-- 
-- -- Recreate original policies (not recommended due to performance issues)
-- -- See migration 20251021000004 for original policy definitions
-- COMMIT;
-- ============================================================================

