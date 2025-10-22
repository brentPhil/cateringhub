-- ============================================================================
-- UPDATE SHIFTS TABLE TO SUPPORT WORKER PROFILES
-- ============================================================================
-- Migration: 20251021000007_update_shifts_for_worker_profiles.sql
-- Date: October 21, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Modify shifts table to support assigning both team members (users with
--   accounts) and worker profiles (non-login staff) to shifts.
--
-- Changes:
--   1. Make user_id nullable (was NOT NULL)
--   2. Add worker_profile_id column (nullable)
--   3. Add constraint: exactly one of user_id OR worker_profile_id must be set
--   4. Add index for worker_profile_id
--   5. Update RLS policies to support worker profile assignments
--   6. Add helper function to get assignee info (user or worker)
--
-- Backward Compatibility:
--   - Existing shifts with user_id continue to work unchanged
--   - New shifts can use either user_id OR worker_profile_id
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: MODIFY SHIFTS TABLE STRUCTURE
-- ============================================================================

-- Make user_id nullable (was NOT NULL)
ALTER TABLE public.shifts 
ALTER COLUMN user_id DROP NOT NULL;

-- Add worker_profile_id column
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS worker_profile_id UUID REFERENCES public.worker_profiles(id) ON DELETE CASCADE;

-- Add constraint: exactly one of user_id OR worker_profile_id must be set
ALTER TABLE public.shifts
ADD CONSTRAINT shifts_assignee_check CHECK (
  (user_id IS NOT NULL AND worker_profile_id IS NULL) OR
  (user_id IS NULL AND worker_profile_id IS NOT NULL)
);

-- Add column comment
COMMENT ON COLUMN public.shifts.worker_profile_id IS 'Reference to worker profile assigned to this shift (mutually exclusive with user_id)';

-- Update table comment
COMMENT ON TABLE public.shifts IS 'Tracks team member and worker profile assignments to bookings with attendance records. Each shift must have either a user_id (team member) or worker_profile_id (worker), but not both.';

-- ============================================================================
-- PHASE 2: CREATE INDEXES
-- ============================================================================

-- Index for querying shifts by worker profile
CREATE INDEX IF NOT EXISTS idx_shifts_worker_profile_id 
ON public.shifts(worker_profile_id) WHERE worker_profile_id IS NOT NULL;

-- Composite index for booking + worker profile lookups
CREATE INDEX IF NOT EXISTS idx_shifts_booking_worker 
ON public.shifts(booking_id, worker_profile_id) WHERE worker_profile_id IS NOT NULL;

-- ============================================================================
-- PHASE 3: UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing RLS policies (we'll recreate them with worker profile support)
DROP POLICY IF EXISTS "Provider members can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Provider members can delete shifts" ON public.shifts;

-- Policy: Provider members can view shifts for their provider's bookings
-- (supports both user_id and worker_profile_id assignments)
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
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can create shifts for their provider's bookings
-- (supports both user_id and worker_profile_id assignments)
CREATE POLICY "Provider members can create shifts"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be an active member of the provider that owns the booking
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
  AND
  -- If assigning a worker profile, it must belong to the same provider
  (
    shifts.worker_profile_id IS NULL
    OR
    EXISTS (
      SELECT 1
      FROM public.worker_profiles wp
      JOIN public.bookings b ON b.provider_id = wp.provider_id
      WHERE wp.id = shifts.worker_profile_id
        AND b.id = shifts.booking_id
    )
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
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
  AND
  -- If assigning a worker profile, it must belong to the same provider
  (
    shifts.worker_profile_id IS NULL
    OR
    EXISTS (
      SELECT 1
      FROM public.worker_profiles wp
      JOIN public.bookings b ON b.provider_id = wp.provider_id
      WHERE wp.id = shifts.worker_profile_id
        AND b.id = shifts.booking_id
    )
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
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- ============================================================================
-- PHASE 4: ADD POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "Provider members can view shifts" ON public.shifts IS 
'Allows active provider members to view all shifts for their provider bookings (both team member and worker profile assignments)';

COMMENT ON POLICY "Provider members can create shifts" ON public.shifts IS 
'Allows active provider members to create shifts for their provider bookings. Validates that worker profiles belong to the same provider.';

COMMENT ON POLICY "Provider members can update shifts" ON public.shifts IS 
'Allows active provider members to update shifts for their provider bookings. Validates that worker profiles belong to the same provider.';

COMMENT ON POLICY "Provider members can delete shifts" ON public.shifts IS 
'Allows active provider members to delete shifts for their provider bookings';

COMMIT;

