-- ============================================================================
-- UPDATE create_manual_booking FUNCTION TO SUPPORT TEAM ASSIGNMENT
-- ============================================================================
-- Migration: 20251101000004_update_create_manual_booking_with_team.sql
-- Date: November 1, 2025
-- Task: Phase 3C - Add team_id parameter to create_manual_booking function
--
-- Purpose:
--   Update the create_manual_booking RPC function to accept team_id parameter
--   for team-based booking assignment.
--
-- Changes:
--   - Add p_team_id parameter to function signature
--   - Include team_id in INSERT statement
--   - Update function permissions
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT
);

-- Create the updated function with team_id parameter
CREATE OR REPLACE FUNCTION public.create_manual_booking(
  -- Required parameters
  p_provider_id UUID,
  p_customer_name TEXT,
  p_event_date DATE,
  
  -- Optional customer contact
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  
  -- Optional event details
  p_event_time TIME DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_guest_count INTEGER DEFAULT NULL,
  p_venue_name TEXT DEFAULT NULL,
  p_venue_address TEXT DEFAULT NULL,
  p_estimated_budget NUMERIC DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  
  -- Optional pricing
  p_base_price NUMERIC DEFAULT NULL,
  
  -- Optional team assignment
  p_team_id UUID DEFAULT NULL,
  
  -- Optional status (defaults to 'pending')
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_booking_id UUID;
  v_result JSON;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated'
      USING ERRCODE = 'PGRST';
  END IF;
  
  -- Validate provider exists
  IF NOT EXISTS (SELECT 1 FROM public.providers WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = 'PGRST',
            HINT = 'The specified provider does not exist';
  END IF;
  
  -- Validate user is a member of the provider (staff or higher)
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_members
    WHERE provider_id = p_provider_id
      AND user_id = v_user_id
      AND role IN ('staff', 'manager', 'admin', 'owner')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not authorized to create bookings for this provider'
      USING ERRCODE = 'PGRST',
            HINT = 'You must be an active staff member or higher';
  END IF;
  
  -- Validate customer name is not empty
  IF TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name cannot be empty'
      USING ERRCODE = 'PGRST';
  END IF;
  
  -- Validate event date is not in the past for active statuses
  IF p_event_date < CURRENT_DATE AND p_status IN ('pending', 'confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Event date cannot be in the past for active bookings'
      USING ERRCODE = 'PGRST',
            HINT = 'Use completed or cancelled status for past events';
  END IF;
  
  -- Validate guest count if provided
  IF p_guest_count IS NOT NULL AND p_guest_count <= 0 THEN
    RAISE EXCEPTION 'Guest count must be greater than zero'
      USING ERRCODE = 'PGRST';
  END IF;
  
  -- Validate pricing if provided
  IF p_base_price IS NOT NULL AND p_base_price < 0 THEN
    RAISE EXCEPTION 'Base price cannot be negative'
      USING ERRCODE = 'PGRST';
  END IF;
  
  -- Validate team exists and belongs to provider if team_id is provided
  IF p_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = p_team_id
        AND provider_id = p_provider_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Team not found or not active for this provider'
        USING ERRCODE = 'PGRST',
              HINT = 'The specified team does not exist or is not active';
    END IF;
  END IF;
  
  -- Insert the booking (total_price will be auto-calculated by trigger)
  INSERT INTO public.bookings (
    provider_id,
    customer_name,
    customer_phone,
    customer_email,
    event_date,
    event_time,
    event_type,
    guest_count,
    venue_name,
    venue_address,
    estimated_budget,
    special_requests,
    notes,
    base_price,
    team_id,
    status,
    source,
    created_by
  ) VALUES (
    p_provider_id,
    TRIM(p_customer_name),
    p_customer_phone,
    p_customer_email,
    p_event_date,
    p_event_time,
    p_event_type,
    p_guest_count,
    p_venue_name,
    p_venue_address,
    p_estimated_budget,
    p_special_requests,
    p_notes,
    p_base_price,
    p_team_id,
    p_status::booking_status,
    'manual'::booking_source,
    v_user_id
  )
  RETURNING id INTO v_booking_id;
  
  -- Build minimal response
  SELECT json_build_object(
    'id', b.id,
    'status', b.status,
    'event_date', b.event_date,
    'source', b.source,
    'base_price', b.base_price,
    'total_price', b.total_price,
    'created_at', b.created_at,
    'created_by', b.created_by
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_booking_id;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create manual booking: %', SQLERRM
      USING ERRCODE = SQLSTATE,
            HINT = 'Check the error message for details';
END;
$$;

-- Update permissions
REVOKE EXECUTE ON FUNCTION public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, UUID, TEXT
) FROM public;

GRANT EXECUTE ON FUNCTION public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, UUID, TEXT
) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.create_manual_booking IS
'Creates a manual booking with server-side validation and automatic price calculation.
Validates user membership, provider existence, date coherence, guest count, pricing, and team assignment.
Automatically sets source=manual, created_by=auth.uid(), and total_price=base_price.
Returns minimal response including pricing information.
Requires user to be staff member or higher of the provider.
Supports optional team assignment for team-based dispatch.';

