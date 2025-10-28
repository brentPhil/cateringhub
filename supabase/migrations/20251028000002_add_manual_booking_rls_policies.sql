-- ============================================================================
-- ADD RLS POLICIES FOR MANUAL BOOKING SUPPORT
-- ============================================================================
-- Migration: 20251028000002_add_manual_booking_rls_policies.sql
-- Date: October 28, 2025
-- Task: Task 2 - Manual Bookings Row Level Security & Visibility
--
-- Purpose:
--   Implement RLS policies to ensure only provider members can create/update
--   their provider's manual bookings, with proper security and audit trails.
--
-- Deliverables:
--   - RLS INSERT policy: user must be member of provider_members
--   - RLS UPDATE/DELETE policy: only provider members can modify
--   - Prevent source column changes after insert
--   - Database trigger to auto-populate created_by = auth.uid()
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE TRIGGER TO AUTO-POPULATE created_by
-- ============================================================================

-- Create trigger function to auto-populate created_by on insert
CREATE OR REPLACE FUNCTION public.set_booking_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-populate created_by with current user for manual bookings
  IF NEW.source = 'manual' AND NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_booking_created_by() IS 
'Automatically sets created_by to auth.uid() for manual bookings on insert';

-- Create trigger
DROP TRIGGER IF EXISTS set_booking_created_by_trigger ON public.bookings;

CREATE TRIGGER set_booking_created_by_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_created_by();

COMMENT ON TRIGGER set_booking_created_by_trigger ON public.bookings IS 
'Auto-populates created_by field for manual bookings';

-- ============================================================================
-- PHASE 2: CREATE TRIGGER TO PREVENT source COLUMN CHANGES
-- ============================================================================

-- Create trigger function to prevent source column changes after insert
CREATE OR REPLACE FUNCTION public.prevent_booking_source_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Prevent changing the source column after insert
  IF OLD.source IS DISTINCT FROM NEW.source THEN
    RAISE EXCEPTION 'Cannot change booking source after creation'
      USING ERRCODE = '23514', -- check_violation
            HINT = 'The source column is immutable after insert';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_booking_source_change() IS 
'Prevents modification of the source column after booking creation';

-- Create trigger
DROP TRIGGER IF EXISTS prevent_booking_source_change_trigger ON public.bookings;

CREATE TRIGGER prevent_booking_source_change_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_booking_source_change();

COMMENT ON TRIGGER prevent_booking_source_change_trigger ON public.bookings IS 
'Ensures source column is immutable after insert';

-- ============================================================================
-- PHASE 3: UPDATE RLS POLICIES FOR MANUAL BOOKINGS
-- ============================================================================

-- Drop existing INSERT policy and recreate with manual booking support
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Customer creating their own booking (auto booking)
  (source = 'auto' AND customer_id = auth.uid())
  OR
  -- Provider member creating manual booking for their provider
  (source = 'manual' AND is_provider_member(provider_id, auth.uid(), 'staff'::provider_role))
);

COMMENT ON POLICY "Users can create bookings" ON public.bookings IS 
'Allows customers to create auto bookings and provider members (staff+) to create manual bookings';

-- ============================================================================
-- PHASE 4: UPDATE UPDATE POLICY TO PREVENT source CHANGES
-- ============================================================================

-- The existing UPDATE policy already restricts updates to provider members
-- We just need to ensure it's documented that source changes are prevented by trigger
-- The existing policy is:
-- "Provider members can update bookings" - allows managers, or staff if assigned_to matches

-- Add a comment to clarify the source immutability
COMMENT ON POLICY "Provider members can update bookings" ON public.bookings IS 
'Allows provider members to update bookings (managers have full access, staff can only update assigned bookings). Note: source column is immutable via trigger.';

-- ============================================================================
-- PHASE 5: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Test auto-population of created_by:
-- INSERT INTO public.bookings (
--   provider_id, customer_name, event_date, source
-- ) VALUES (
--   'some-provider-uuid', 'Test Customer', CURRENT_DATE + 7, 'manual'
-- ) RETURNING id, created_by;

-- Test source immutability:
-- UPDATE public.bookings 
-- SET source = 'auto' 
-- WHERE id = 'some-booking-uuid';
-- Expected: ERROR: Cannot change booking source after creation

-- Test RLS policy for manual booking creation:
-- As a non-member user, try to create a manual booking:
-- INSERT INTO public.bookings (
--   provider_id, customer_name, event_date, source
-- ) VALUES (
--   'other-provider-uuid', 'Test Customer', CURRENT_DATE + 7, 'manual'
-- );
-- Expected: ERROR: new row violates row-level security policy

-- Test RLS policy for auto booking creation:
-- As a customer, create an auto booking:
-- INSERT INTO public.bookings (
--   provider_id, customer_id, customer_name, event_date, source
-- ) VALUES (
--   'some-provider-uuid', auth.uid(), 'My Name', CURRENT_DATE + 7, 'auto'
-- );
-- Expected: SUCCESS

