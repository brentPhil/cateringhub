-- ============================================================================
-- CREATE RPC FUNCTION FOR MANUAL BOOKING CREATION
-- ============================================================================
-- Migration: 20251028000003_create_manual_booking_rpc.sql
-- Date: October 28, 2025
-- Task: Task 3 - RPC Function create_manual_booking
--
-- Purpose:
--   Create server-side RPC function to create manual bookings with validation,
--   minimizing client-server data transfer and ensuring data integrity.
--
-- Deliverables:
--   - RPC function with comprehensive parameter validation
--   - Server-side validation for dates, guest count, and provider membership
--   - Minimal response payload for performance
--   - Automatic source='manual' and created_by=auth.uid() setting
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE RPC FUNCTION
-- ============================================================================

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
  
  -- Optional status (defaults to 'pending')
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_booking_id UUID;
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_result JSON;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Validation 1: User must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501', -- insufficient_privilege
            HINT = 'User must be authenticated to create manual bookings';
  END IF;
  
  -- Validation 2: User must be a member of the provider (staff or higher)
  v_is_member := is_provider_member(p_provider_id, v_user_id, 'staff'::provider_role);
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not authorized to create bookings for this provider'
      USING ERRCODE = '42501', -- insufficient_privilege
            HINT = 'User must be a staff member or higher of the provider';
  END IF;
  
  -- Validation 3: Provider must exist
  IF NOT EXISTS (SELECT 1 FROM public.providers WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = '23503', -- foreign_key_violation
            HINT = 'The specified provider_id does not exist';
  END IF;
  
  -- Validation 4: Event date must be in the future (unless status is cancelled/completed)
  IF p_event_date < CURRENT_DATE AND p_status NOT IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Event date must be in the future for active bookings'
      USING ERRCODE = '23514', -- check_violation
            HINT = 'Cannot create bookings with past dates unless status is cancelled or completed';
  END IF;
  
  -- Validation 5: Guest count must be positive if provided
  IF p_guest_count IS NOT NULL AND p_guest_count <= 0 THEN
    RAISE EXCEPTION 'Guest count must be greater than zero'
      USING ERRCODE = '23514', -- check_violation
            HINT = 'Provide a valid positive number for guest count';
  END IF;
  
  -- Validation 6: Status must be valid
  IF p_status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking status'
      USING ERRCODE = '23514', -- check_violation
            HINT = 'Status must be one of: pending, confirmed, in_progress, completed, cancelled';
  END IF;
  
  -- Validation 7: Customer name must not be empty
  IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required'
      USING ERRCODE = '23502', -- not_null_violation
            HINT = 'Provide a valid customer name';
  END IF;
  
  -- Insert the booking
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
    'created_at', b.created_at,
    'created_by', b.created_by
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_booking_id;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE EXCEPTION 'Failed to create manual booking: %', SQLERRM
      USING ERRCODE = SQLSTATE,
            HINT = 'Check the error message for details';
END;
$$;

-- ============================================================================
-- PHASE 2: SET PERMISSIONS AND COMMENTS
-- ============================================================================

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT
) FROM public;

-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT
) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.create_manual_booking IS
'Creates a manual booking with server-side validation. 
Validates user membership, provider existence, date coherence, and guest count.
Automatically sets source=manual and created_by=auth.uid().
Returns minimal response: id, status, event_date, source, created_at, created_by.
Requires user to be staff member or higher of the provider.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Test successful manual booking creation:
-- SELECT create_manual_booking(
--   p_provider_id := 'valid-provider-uuid',
--   p_customer_name := 'John Doe',
--   p_customer_phone := '+1234567890',
--   p_event_date := CURRENT_DATE + 7,
--   p_event_time := '14:00:00',
--   p_guest_count := 50,
--   p_venue_name := 'Grand Ballroom',
--   p_status := 'pending'
-- );

-- Test validation: past date with active status (should fail)
-- SELECT create_manual_booking(
--   p_provider_id := 'valid-provider-uuid',
--   p_customer_name := 'Jane Doe',
--   p_event_date := CURRENT_DATE - 1,
--   p_status := 'pending'
-- );

-- Test validation: invalid guest count (should fail)
-- SELECT create_manual_booking(
--   p_provider_id := 'valid-provider-uuid',
--   p_customer_name := 'Jane Doe',
--   p_event_date := CURRENT_DATE + 7,
--   p_guest_count := -5
-- );

-- Test validation: non-member user (should fail)
-- SELECT create_manual_booking(
--   p_provider_id := 'other-provider-uuid',
--   p_customer_name := 'Jane Doe',
--   p_event_date := CURRENT_DATE + 7
-- );

-- Test validation: empty customer name (should fail)
-- SELECT create_manual_booking(
--   p_provider_id := 'valid-provider-uuid',
--   p_customer_name := '',
--   p_event_date := CURRENT_DATE + 7
-- );

