-- ============================================================================
-- ADD CAPACITY FIELDS TO SERVICE LOCATIONS
-- ============================================================================
-- Migration: 20251101000005_add_capacity_to_service_locations.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Extend service locations with capacity fields
--
-- Purpose:
--   Add capacity management fields to service_locations table to support
--   location-based capacity planning and concurrent event management.
--   Each kitchen/depot can have its own capacity limits.
--
-- Changes:
--   - Add daily_capacity column (max events per day)
--   - Add max_concurrent_events column (max simultaneous events)
--   - Add check constraints to ensure values are >= 1 if provided
--   - Add logical constraint to ensure max_concurrent <= daily_capacity
--   - Add column comments for documentation
--
-- Notes:
--   - Columns are nullable to support locations without capacity limits
--   - NULL values mean unlimited capacity
--   - These fields complement the existing global daily_capacity on providers
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD COLUMNS
-- ============================================================================

-- Add daily_capacity column (nullable = unlimited)
ALTER TABLE public.service_locations 
ADD COLUMN IF NOT EXISTS daily_capacity INTEGER;

-- Add max_concurrent_events column (nullable = unlimited)
ALTER TABLE public.service_locations 
ADD COLUMN IF NOT EXISTS max_concurrent_events INTEGER;

-- Add column comments
COMMENT ON COLUMN public.service_locations.daily_capacity IS 
'Maximum number of events this location can handle per day. NULL = unlimited capacity.';

COMMENT ON COLUMN public.service_locations.max_concurrent_events IS 
'Maximum number of simultaneous events this location can handle. NULL = unlimited. Should be <= daily_capacity.';

-- ============================================================================
-- PHASE 2: ADD CHECK CONSTRAINTS
-- ============================================================================

-- Constraint: daily_capacity must be >= 1 if provided
ALTER TABLE public.service_locations
ADD CONSTRAINT service_locations_daily_capacity_positive 
CHECK (daily_capacity IS NULL OR daily_capacity >= 1);

COMMENT ON CONSTRAINT service_locations_daily_capacity_positive ON public.service_locations IS 
'Ensures daily capacity is at least 1 if specified. NULL means unlimited.';

-- Constraint: max_concurrent_events must be >= 1 if provided
ALTER TABLE public.service_locations
ADD CONSTRAINT service_locations_max_concurrent_positive 
CHECK (max_concurrent_events IS NULL OR max_concurrent_events >= 1);

COMMENT ON CONSTRAINT service_locations_max_concurrent_positive ON public.service_locations IS 
'Ensures max concurrent events is at least 1 if specified. NULL means unlimited.';

-- Constraint: max_concurrent_events should be <= daily_capacity (logical constraint)
ALTER TABLE public.service_locations
ADD CONSTRAINT service_locations_capacity_logical 
CHECK (
  max_concurrent_events IS NULL OR 
  daily_capacity IS NULL OR 
  max_concurrent_events <= daily_capacity
);

COMMENT ON CONSTRAINT service_locations_capacity_logical ON public.service_locations IS 
'Ensures max concurrent events does not exceed daily capacity. NULL values are treated as unlimited.';

-- ============================================================================
-- PHASE 3: UPDATE EXISTING RECORDS (OPTIONAL)
-- ============================================================================

-- Optionally set default capacity values for existing service locations
-- based on the provider's global daily_capacity setting
-- Uncomment if you want to initialize capacity values

-- UPDATE public.service_locations sl
-- SET 
--   daily_capacity = COALESCE(
--     (SELECT p.daily_capacity FROM public.providers p WHERE p.id = sl.provider_id),
--     3  -- fallback default
--   ),
--   max_concurrent_events = COALESCE(
--     (SELECT LEAST(p.daily_capacity, 2) FROM public.providers p WHERE p.id = sl.provider_id),
--     2  -- fallback default
--   )
-- WHERE daily_capacity IS NULL;

-- ============================================================================
-- PHASE 4: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'service_locations' 
--   AND column_name IN ('daily_capacity', 'max_concurrent_events')
-- ORDER BY column_name;

-- Verify check constraints:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.service_locations'::regclass
--   AND conname LIKE '%capacity%'
-- ORDER BY conname;

-- Test setting capacity values:
-- UPDATE public.service_locations
-- SET daily_capacity = 5, max_concurrent_events = 3
-- WHERE id = 'location-uuid'
-- RETURNING *;

-- Test constraint violations (should fail):
-- UPDATE public.service_locations
-- SET daily_capacity = 0  -- should fail: must be >= 1
-- WHERE id = 'location-uuid';

-- UPDATE public.service_locations
-- SET daily_capacity = 2, max_concurrent_events = 5  -- should fail: concurrent > daily
-- WHERE id = 'location-uuid';

-- Query locations with capacity info:
-- SELECT 
--   sl.id,
--   sl.city,
--   sl.is_primary,
--   sl.daily_capacity,
--   sl.max_concurrent_events,
--   p.business_name as provider_name
-- FROM public.service_locations sl
-- JOIN public.providers p ON p.id = sl.provider_id
-- ORDER BY p.business_name, sl.is_primary DESC, sl.city;

-- Check capacity utilization (example query):
-- SELECT 
--   sl.id,
--   sl.city,
--   sl.daily_capacity,
--   COUNT(b.id) FILTER (WHERE b.event_date = CURRENT_DATE AND b.status IN ('confirmed', 'in_progress')) as bookings_today,
--   sl.daily_capacity - COUNT(b.id) FILTER (WHERE b.event_date = CURRENT_DATE AND b.status IN ('confirmed', 'in_progress')) as remaining_capacity
-- FROM public.service_locations sl
-- LEFT JOIN public.bookings b ON b.service_location_id = sl.id
-- WHERE sl.provider_id = 'provider-uuid'
-- GROUP BY sl.id, sl.city, sl.daily_capacity
-- ORDER BY sl.is_primary DESC, sl.city;

