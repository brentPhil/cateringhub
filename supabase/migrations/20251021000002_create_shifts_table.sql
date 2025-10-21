-- ============================================================================
-- CREATE SHIFTS TABLE FOR ATTENDANCE TRACKING
-- ============================================================================
-- Migration: 20251021000002_create_shifts_table.sql
-- Date: October 21, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Create shifts table to track team member assignments to bookings and
--   record attendance (check-in/check-out times) for manager-handled
--   attendance tracking.
--
-- Features:
--   - Assign provider members (seat users) to bookings as shifts
--   - Track scheduled vs actual times for attendance
--   - Manager-recorded check-in/check-out (no self-service yet)
--   - RLS policies scoped to provider membership
--
-- Changes:
--   1. Create shifts table with scheduled and actual time tracking
--   2. Add RLS policies for provider member access
--   3. Create indexes for query performance
--   4. Add triggers for updated_at timestamp
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE SHIFTS TABLE
-- ============================================================================

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Shift details
  role TEXT,
  
  -- Scheduled times (set when shift is created)
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  -- Actual times (recorded by manager during event)
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_scheduled_times CHECK (
    scheduled_start IS NULL OR 
    scheduled_end IS NULL OR 
    scheduled_end > scheduled_start
  ),
  CONSTRAINT valid_actual_times CHECK (
    actual_start IS NULL OR 
    actual_end IS NULL OR 
    actual_end > actual_start
  )
);

-- Add table comment
COMMENT ON TABLE public.shifts IS 'Tracks team member assignments to bookings and attendance records';

-- Add column comments
COMMENT ON COLUMN public.shifts.id IS 'Unique identifier for the shift';
COMMENT ON COLUMN public.shifts.booking_id IS 'Reference to the booking this shift is for';
COMMENT ON COLUMN public.shifts.user_id IS 'Reference to the team member assigned to this shift';
COMMENT ON COLUMN public.shifts.role IS 'Role or position for this shift (e.g., "Server", "Chef", "Coordinator")';
COMMENT ON COLUMN public.shifts.scheduled_start IS 'Planned start time for the shift';
COMMENT ON COLUMN public.shifts.scheduled_end IS 'Planned end time for the shift';
COMMENT ON COLUMN public.shifts.actual_start IS 'Actual check-in time recorded by manager';
COMMENT ON COLUMN public.shifts.actual_end IS 'Actual check-out time recorded by manager';
COMMENT ON COLUMN public.shifts.status IS 'Current status: scheduled, checked_in, checked_out, cancelled';
COMMENT ON COLUMN public.shifts.notes IS 'Optional notes about the shift';

-- ============================================================================
-- PHASE 2: CREATE INDEXES
-- ============================================================================

-- Index for querying shifts by booking
CREATE INDEX IF NOT EXISTS idx_shifts_booking_id 
ON public.shifts(booking_id);

-- Index for querying shifts by user
CREATE INDEX IF NOT EXISTS idx_shifts_user_id 
ON public.shifts(user_id);

-- Index for querying shifts by status
CREATE INDEX IF NOT EXISTS idx_shifts_status 
ON public.shifts(status);

-- Composite index for common queries (booking + status)
CREATE INDEX IF NOT EXISTS idx_shifts_booking_status 
ON public.shifts(booking_id, status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_shifts_scheduled_start 
ON public.shifts(scheduled_start);

-- ============================================================================
-- PHASE 3: CREATE TRIGGERS
-- ============================================================================

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shifts_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shifts_updated_at();

-- Create trigger to automatically update status based on actual times
CREATE OR REPLACE FUNCTION public.update_shift_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-update status based on actual times
  IF NEW.actual_end IS NOT NULL THEN
    NEW.status = 'checked_out';
  ELSIF NEW.actual_start IS NOT NULL THEN
    NEW.status = 'checked_in';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_shift_status
  BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shift_status();

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on shifts table
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 5: CREATE RLS POLICIES
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
      AND pm.user_id = auth.uid()
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
      AND pm.user_id = auth.uid()
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
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    JOIN public.bookings b ON b.provider_id = pm.provider_id
    WHERE b.id = shifts.booking_id
      AND pm.user_id = auth.uid()
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
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
);

-- ============================================================================
-- PHASE 6: VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'shifts'
  ) THEN
    RAISE EXCEPTION 'Shifts table was not created successfully';
  END IF;
  
  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'shifts' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS was not enabled on shifts table';
  END IF;
  
  RAISE NOTICE 'Shifts table created successfully with RLS enabled';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS auto_update_shift_status ON public.shifts;
-- DROP TRIGGER IF EXISTS set_shifts_updated_at ON public.shifts;
-- DROP FUNCTION IF EXISTS public.update_shift_status();
-- DROP FUNCTION IF EXISTS public.update_shifts_updated_at();
-- DROP TABLE IF EXISTS public.shifts CASCADE;
-- COMMIT;
-- ============================================================================

