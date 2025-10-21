-- ============================================================================
-- CLEANUP DUPLICATE PROVIDER MEMBERS RLS POLICIES
-- ============================================================================
-- This migration removes old/duplicate RLS policies that are causing issues
-- with the team members list
-- ============================================================================

-- Drop all old policies that were not properly removed
DROP POLICY IF EXISTS "Admins can remove members" ON public.provider_members;
DROP POLICY IF EXISTS "Admins can invite members" ON public.provider_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.provider_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.provider_members;

-- Also drop the "Users can view their own membership" policy if it exists
-- as it's redundant with "Members can view their provider members"
DROP POLICY IF EXISTS "Users can view their own membership" ON public.provider_members;

-- Verify the remaining policies are correct:
-- 1. "Admins and owners can create members" (INSERT)
-- 2. "Members can view their provider members" (SELECT)
-- 3. "Admins and owners can update members" (UPDATE)
-- 4. "Admins and owners can remove members" (DELETE)

-- Add a comment to document the cleanup
COMMENT ON TABLE public.provider_members IS 
'Provider team members table with RLS policies. Cleaned up duplicate policies on 2025-01-20.';

