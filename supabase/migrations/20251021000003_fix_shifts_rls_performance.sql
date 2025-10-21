-- ============================================================================
-- FIX RLS PERFORMANCE ISSUES FOR SHIFTS TABLE
-- ============================================================================
-- Migration: 20251021000003_fix_shifts_rls_performance.sql
-- Date: October 21, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Fix RLS policy performance issues by wrapping auth.uid() calls in
--   (select auth.uid()) to prevent re-evaluation for each row.
--
-- Reference:
--   https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Changes:
--   1. Drop existing RLS policies on shifts table
--   2. Recreate policies with optimized auth.uid() calls
--
-- Estimated Time: < 10 seconds
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Provider members can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can delete shifts" ON public.shifts;

-- ============================================================================
-- CREATE OPTIMIZED RLS POLICIES
-- ============================================================================

-- Policy: Provider members can view shifts for their provider's bookings
CREATE POLICY "Provider members can view shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (select auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can create shifts for their provider's bookings
CREATE POLICY "Provider members can create shifts"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (select auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can update shifts for their provider's bookings
CREATE POLICY "Provider members can update shifts"
ON public.shifts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (select auth.uid())
      AND pm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (select auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can delete shifts for their provider's bookings
CREATE POLICY "Provider members can delete shifts"
ON public.shifts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (select auth.uid())
      AND pm.status = 'active'
  )
);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verify all 4 policies were created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'shifts';
  
  IF policy_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 RLS policies on shifts table, found %', policy_count;
  END IF;
  
  RAISE NOTICE 'RLS policies optimized successfully. Found % policies.', policy_count;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run the original policies from
-- migration 20251021000002_create_shifts_table.sql
-- ============================================================================

