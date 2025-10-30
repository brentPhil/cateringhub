-- ============================================================================
-- CLEANUP AND UPDATE RLS POLICIES FOR TEAM-BASED ASSIGNMENT
-- ============================================================================
-- Migration: 20251101000009_cleanup_rls_policies.sql
-- Date: November 1, 2025
-- Task: Phase 2 - RLS Policies & Security - Cleanup existing policies
--
-- Purpose:
--   Clean up and update existing RLS policies to support team-based assignment
--   model and remove redundant logic. This migration:
--   1. Updates bookings policies to use team-based access control
--   2. Simplifies service_locations policies to remove redundant checks
--   3. Simplifies providers policies to use helper functions
--   4. Maintains backwards compatibility during migration period
--
-- Changes:
--   - Replace 2 bookings policies (SELECT, UPDATE) with team-based versions
--   - Simplify 4 service_locations policies
--   - Simplify 3 providers policies
--   - Keep all other policies unchanged
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: UPDATE BOOKINGS POLICIES FOR TEAM-BASED ACCESS
-- ============================================================================

-- Drop existing bookings SELECT policy
DROP POLICY IF EXISTS "Provider members can view bookings" ON public.bookings;

-- Create new team-based SELECT policy
-- Staff can see bookings for their team, managers+ can see all bookings
CREATE POLICY "Provider members can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- Managers and above can see all bookings for their provider
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role) OR
  
  -- Staff can see bookings for their team (team-based access)
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    public.is_team_member_for_booking(id, auth.uid())
  ) OR
  
  -- BACKWARDS COMPATIBILITY: During migration, staff can still see individually assigned bookings
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    assigned_to = auth.uid()
  ) OR
  
  -- Customers can see their own bookings
  customer_id = auth.uid()
);

COMMENT ON POLICY "Provider members can view bookings" ON public.bookings IS 
'Team-based access: Managers see all, staff see team bookings + individually assigned (migration compatibility), customers see own';

-- ============================================================================

-- Drop existing bookings UPDATE policy
DROP POLICY IF EXISTS "Provider members can update bookings" ON public.bookings;

-- Create new team-based UPDATE policy
CREATE POLICY "Provider members can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  -- Managers and above can update all bookings for their provider
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role) OR
  
  -- Staff can update bookings for their team (team-based access)
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    public.is_team_member_for_booking(id, auth.uid())
  ) OR
  
  -- BACKWARDS COMPATIBILITY: During migration, staff can still update individually assigned bookings
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    assigned_to = auth.uid()
  ) OR
  
  -- Customers can update their own pending bookings
  (customer_id = auth.uid() AND status = 'pending'::public.booking_status)
)
WITH CHECK (
  -- Same logic for WITH CHECK
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role) OR
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    public.is_team_member_for_booking(id, auth.uid())
  ) OR
  (
    public.is_provider_member(provider_id, auth.uid(), 'staff'::public.provider_role) AND
    assigned_to = auth.uid()
  ) OR
  (customer_id = auth.uid() AND status = 'pending'::public.booking_status)
);

COMMENT ON POLICY "Provider members can update bookings" ON public.bookings IS 
'Team-based access: Managers update all, staff update team bookings + individually assigned (migration compatibility), customers update pending';

-- ============================================================================
-- PHASE 2: SIMPLIFY SERVICE_LOCATIONS POLICIES
-- ============================================================================

-- Drop all existing service_locations policies
DROP POLICY IF EXISTS "Team members can view service locations" ON public.service_locations;
DROP POLICY IF EXISTS "Team members can insert service locations" ON public.service_locations;
DROP POLICY IF EXISTS "Team members can update service locations" ON public.service_locations;
DROP POLICY IF EXISTS "Team members can delete service locations" ON public.service_locations;

-- Recreate with simplified logic using helper functions

-- SELECT policy
CREATE POLICY "Team members can view service locations"
ON public.service_locations
FOR SELECT
TO authenticated
USING (
  public.is_provider_member(provider_id, auth.uid(), 'viewer'::public.provider_role)
);

COMMENT ON POLICY "Team members can view service locations" ON public.service_locations IS 
'All provider members can view service locations';

-- INSERT policy
CREATE POLICY "Team members can insert service locations"
ON public.service_locations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

COMMENT ON POLICY "Team members can insert service locations" ON public.service_locations IS 
'Managers and above can create service locations';

-- UPDATE policy
CREATE POLICY "Team members can update service locations"
ON public.service_locations
FOR UPDATE
TO authenticated
USING (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
)
WITH CHECK (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

COMMENT ON POLICY "Team members can update service locations" ON public.service_locations IS 
'Managers and above can update service locations';

-- DELETE policy
CREATE POLICY "Team members can delete service locations"
ON public.service_locations
FOR DELETE
TO authenticated
USING (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

COMMENT ON POLICY "Team members can delete service locations" ON public.service_locations IS 
'Managers and above can delete service locations';

-- ============================================================================
-- PHASE 3: SIMPLIFY PROVIDERS POLICIES
-- ============================================================================

-- Drop existing providers policies that need simplification
DROP POLICY IF EXISTS "Team members can view provider profile" ON public.providers;
DROP POLICY IF EXISTS "Team members can update provider profile" ON public.providers;
DROP POLICY IF EXISTS "Owners can delete providers" ON public.providers;

-- Recreate with simplified logic using helper functions

-- SELECT policy
CREATE POLICY "Team members can view provider profile"
ON public.providers
FOR SELECT
TO authenticated
USING (
  public.is_provider_member(id, auth.uid(), 'viewer'::public.provider_role)
);

COMMENT ON POLICY "Team members can view provider profile" ON public.providers IS 
'All provider members can view provider profile';

-- UPDATE policy
CREATE POLICY "Team members can update provider profile"
ON public.providers
FOR UPDATE
TO authenticated
USING (
  public.is_provider_member(id, auth.uid(), 'manager'::public.provider_role)
)
WITH CHECK (
  public.is_provider_member(id, auth.uid(), 'manager'::public.provider_role)
);

COMMENT ON POLICY "Team members can update provider profile" ON public.providers IS 
'Managers and above can update provider profile';

-- DELETE policy
CREATE POLICY "Owners can delete providers"
ON public.providers
FOR DELETE
TO authenticated
USING (
  public.is_provider_member(id, auth.uid(), 'owner'::public.provider_role)
);

COMMENT ON POLICY "Owners can delete providers" ON public.providers IS 
'Only owners can delete providers';

-- ============================================================================
-- PHASE 4: VALIDATION
-- ============================================================================

DO $$
DECLARE
  v_bookings_policies INTEGER;
  v_service_locations_policies INTEGER;
  v_providers_policies INTEGER;
BEGIN
  -- Count policies for each table
  SELECT COUNT(*) INTO v_bookings_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'bookings';
  
  SELECT COUNT(*) INTO v_service_locations_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'service_locations';
  
  SELECT COUNT(*) INTO v_providers_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'providers';
  
  -- Verify expected policy counts
  IF v_bookings_policies <> 4 THEN
    RAISE EXCEPTION 'Expected 4 bookings policies, found %', v_bookings_policies;
  END IF;
  
  IF v_service_locations_policies <> 4 THEN
    RAISE EXCEPTION 'Expected 4 service_locations policies, found %', v_service_locations_policies;
  END IF;
  
  IF v_providers_policies <> 4 THEN
    RAISE EXCEPTION 'Expected 4 providers policies, found %', v_providers_policies;
  END IF;
  
  RAISE NOTICE 'RLS policy cleanup completed successfully';
  RAISE NOTICE 'Bookings policies: % (team-based access enabled)', v_bookings_policies;
  RAISE NOTICE 'Service locations policies: % (simplified)', v_service_locations_policies;
  RAISE NOTICE 'Providers policies: % (simplified)', v_providers_policies;
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- BACKWARDS COMPATIBILITY:
-- The bookings policies include backwards compatibility checks for the
-- migration period. Staff can access bookings via EITHER:
-- 1. Team membership (new team-based model)
-- 2. Individual assignment (old assigned_to model)
--
-- Once migration is complete and all bookings have team_id assigned,
-- the assigned_to checks can be removed in a future migration.
--
-- TESTING:
-- After applying this migration, test the following scenarios:
-- 1. Manager can view/update all bookings for their provider
-- 2. Staff can view/update bookings for their team
-- 3. Staff can still view/update individually assigned bookings (migration)
-- 4. Customers can view/update their own bookings
-- 5. Service locations are accessible to all members, editable by managers+
-- 6. Provider profiles are accessible to all members, editable by managers+
--
-- ============================================================================

