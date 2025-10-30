-- ============================================================================
-- ADD SERVICE LOCATION LINKAGE TO BOOKINGS
-- ============================================================================
-- Migration: 20251101000001_add_service_location_to_bookings.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Add service-location linkage to bookings
--
-- Purpose:
--   Add service_location_id column to bookings table to support location-based
--   assignment model. This is the first step in migrating from individual
--   assignment to team/location-based dispatch.
--
-- Changes:
--   - Add nullable service_location_id column to bookings
--   - Add foreign key constraint to service_locations table
--   - Create composite index for efficient location-based queries
--   - Add column comment for documentation
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD COLUMN
-- ============================================================================

-- Add service_location_id column (nullable to support gradual migration)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_location_id UUID;

-- Add column comment
COMMENT ON COLUMN public.bookings.service_location_id IS 
'Service location responsible for this booking. Part of team-based assignment model. NULL during migration period.';

-- ============================================================================
-- PHASE 2: ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key to service_locations table
-- ON DELETE SET NULL to preserve booking history if location is deleted
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_service_location_id_fkey 
FOREIGN KEY (service_location_id) 
REFERENCES public.service_locations(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT bookings_service_location_id_fkey ON public.bookings IS 
'Links booking to service location. SET NULL on delete to preserve booking history.';

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for location-based booking queries
-- Optimized for: "Get all bookings for a location, sorted by date, filtered by status"
-- This is the primary query pattern for team-based dashboards
CREATE INDEX IF NOT EXISTS idx_bookings_service_location_event_date_status 
ON public.bookings(service_location_id, event_date DESC, status)
WHERE service_location_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_service_location_event_date_status IS 
'Partial index for location-based booking queries. Supports team dashboard views showing bookings by location, date, and status.';

-- ============================================================================
-- PHASE 4: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'bookings' 
--   AND column_name = 'service_location_id';

-- Verify foreign key constraint:
-- SELECT conname, contype, confdeltype
-- FROM pg_constraint
-- WHERE conname = 'bookings_service_location_id_fkey';

-- Verify index was created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings'
--   AND indexname = 'idx_bookings_service_location_event_date_status';

-- Test query performance (should use the new index):
-- EXPLAIN ANALYZE
-- SELECT id, event_date, status
-- FROM public.bookings
-- WHERE service_location_id = 'some-uuid'
--   AND event_date >= CURRENT_DATE
--   AND status = 'confirmed'
-- ORDER BY event_date DESC;

