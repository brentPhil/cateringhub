-- ============================================================================
-- ADD PRICING FIELDS TO BOOKINGS TABLE
-- ============================================================================
-- Migration: 20251028000004_add_booking_pricing_fields.sql
-- Date: October 28, 2025
-- Task: Task 7 - Basic Pricing Integrity & Totals
--
-- Purpose:
--   Add pricing fields to bookings table with automatic calculation and
--   validation to ensure pricing integrity for manual bookings.
--
-- Deliverables:
--   - Add base_price column (the base price set by provider)
--   - Add total_price column (computed from base_price, no taxes/fees in V1)
--   - Trigger to auto-calculate total_price from base_price
--   - Check constraint: total_price >= 0
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD PRICING COLUMNS
-- ============================================================================

-- Add base_price column (nullable for auto bookings, required for manual bookings)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2);

-- Add total_price column (auto-calculated from base_price)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2);

-- Add column comments
COMMENT ON COLUMN public.bookings.base_price IS 
'Base price for the booking set by the provider (before any taxes or fees). Required for manual bookings.';

COMMENT ON COLUMN public.bookings.total_price IS 
'Total price for the booking (auto-calculated from base_price in V1, will include taxes/fees in future versions)';

-- ============================================================================
-- PHASE 2: ADD CHECK CONSTRAINTS
-- ============================================================================

-- Constraint: base_price must be non-negative if provided
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_base_price_non_negative 
CHECK (base_price IS NULL OR base_price >= 0);

-- Constraint: total_price must be non-negative if provided
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_total_price_non_negative 
CHECK (total_price IS NULL OR total_price >= 0);

COMMENT ON CONSTRAINT bookings_base_price_non_negative ON public.bookings IS 
'Ensures base_price is non-negative when provided';

COMMENT ON CONSTRAINT bookings_total_price_non_negative ON public.bookings IS 
'Ensures total_price is non-negative when provided';

-- ============================================================================
-- PHASE 3: CREATE TRIGGER TO AUTO-CALCULATE total_price
-- ============================================================================

-- Create trigger function to auto-calculate total_price from base_price
CREATE OR REPLACE FUNCTION public.calculate_booking_total_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-calculate total_price from base_price if base_price is provided
  -- In V1, total_price = base_price (no taxes or fees)
  -- In future versions, this can be extended to include taxes, fees, etc.
  IF NEW.base_price IS NOT NULL THEN
    NEW.total_price := NEW.base_price;
  ELSE
    -- If base_price is NULL, total_price should also be NULL
    NEW.total_price := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_booking_total_price() IS 
'Automatically calculates total_price from base_price on insert/update. In V1: total_price = base_price.';

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS calculate_booking_total_price_insert ON public.bookings;

CREATE TRIGGER calculate_booking_total_price_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_booking_total_price();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS calculate_booking_total_price_update ON public.bookings;

CREATE TRIGGER calculate_booking_total_price_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price)
  EXECUTE FUNCTION public.calculate_booking_total_price();

COMMENT ON TRIGGER calculate_booking_total_price_insert ON public.bookings IS 
'Auto-calculates total_price from base_price on insert';

COMMENT ON TRIGGER calculate_booking_total_price_update ON public.bookings IS 
'Auto-calculates total_price from base_price when base_price changes';

-- ============================================================================
-- PHASE 4: UPDATE create_manual_booking RPC TO INCLUDE PRICING
-- ============================================================================

-- Update the create_manual_booking function to accept base_price parameter
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
  
  -- Optional pricing (new parameter)
  p_base_price NUMERIC DEFAULT NULL,
  
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
      USING ERRCODE = '42501',
            HINT = 'User must be authenticated to create manual bookings';
  END IF;
  
  -- Validation 2: User must be a member of the provider (staff or higher)
  v_is_member := is_provider_member(p_provider_id, v_user_id, 'staff'::provider_role);
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not authorized to create bookings for this provider'
      USING ERRCODE = '42501',
            HINT = 'User must be a staff member or higher of the provider';
  END IF;
  
  -- Validation 3: Provider must exist
  IF NOT EXISTS (SELECT 1 FROM public.providers WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = '23503',
            HINT = 'The specified provider_id does not exist';
  END IF;
  
  -- Validation 4: Event date must be in the future (unless status is cancelled/completed)
  IF p_event_date < CURRENT_DATE AND p_status NOT IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Event date must be in the future for active bookings'
      USING ERRCODE = '23514',
            HINT = 'Cannot create bookings with past dates unless status is cancelled or completed';
  END IF;
  
  -- Validation 5: Guest count must be positive if provided
  IF p_guest_count IS NOT NULL AND p_guest_count <= 0 THEN
    RAISE EXCEPTION 'Guest count must be greater than zero'
      USING ERRCODE = '23514',
            HINT = 'Provide a valid positive number for guest count';
  END IF;
  
  -- Validation 6: Status must be valid
  IF p_status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking status'
      USING ERRCODE = '23514',
            HINT = 'Status must be one of: pending, confirmed, in_progress, completed, cancelled';
  END IF;
  
  -- Validation 7: Customer name must not be empty
  IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required'
      USING ERRCODE = '23502',
            HINT = 'Provide a valid customer name';
  END IF;
  
  -- Validation 8: Base price must be non-negative if provided
  IF p_base_price IS NOT NULL AND p_base_price < 0 THEN
    RAISE EXCEPTION 'Base price must be non-negative'
      USING ERRCODE = '23514',
            HINT = 'Provide a valid non-negative base price';
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
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT
) FROM public;

GRANT EXECUTE ON FUNCTION public.create_manual_booking(
  UUID, TEXT, DATE, TEXT, TEXT, TIME, TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT
) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.create_manual_booking IS
'Creates a manual booking with server-side validation and automatic price calculation.
Validates user membership, provider existence, date coherence, guest count, and pricing.
Automatically sets source=manual, created_by=auth.uid(), and total_price=base_price.
Returns minimal response including pricing information.
Requires user to be staff member or higher of the provider.';

