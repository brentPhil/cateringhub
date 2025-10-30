-- ============================================================================
-- ADD TEAM LINKAGE TO BOOKINGS
-- ============================================================================
-- Migration: 20251101000004_add_team_to_bookings.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Link bookings to teams
--
-- Purpose:
--   Add team_id column to bookings table to explicitly assign bookings
--   to teams. This works in conjunction with service_location_id to
--   support flexible team-based assignment (multiple teams per location
--   or cross-location team assignments).
--
-- Changes:
--   - Add nullable team_id column to bookings
--   - Add foreign key constraint to teams table
--   - Create indexes for efficient team-based booking queries
--   - Add column comment for documentation
--
-- Notes:
--   - Column is nullable to support gradual migration
--   - Both service_location_id and team_id can be set for maximum flexibility
--   - Future: may add constraint to ensure team belongs to service location
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD COLUMN
-- ============================================================================

-- Add team_id column (nullable to support gradual migration)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add column comment
COMMENT ON COLUMN public.bookings.team_id IS 
'Team responsible for this booking. Works with service_location_id for team-based assignment. NULL during migration period.';

-- ============================================================================
-- PHASE 2: ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key to teams table
-- ON DELETE SET NULL to preserve booking history if team is deleted
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_team_id_fkey 
FOREIGN KEY (team_id) 
REFERENCES public.teams(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT bookings_team_id_fkey ON public.bookings IS 
'Links booking to team. SET NULL on delete to preserve booking history.';

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying bookings by team
CREATE INDEX IF NOT EXISTS idx_bookings_team_id 
ON public.bookings(team_id)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_team_id IS 
'Partial index for team-based booking queries. Excludes unassigned bookings.';

-- Composite index for team + event_date + status queries
-- Optimized for: "Get all bookings for a team, sorted by date, filtered by status"
-- This is the primary query pattern for team-based dashboards
CREATE INDEX IF NOT EXISTS idx_bookings_team_event_date_status 
ON public.bookings(team_id, event_date DESC, status)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_team_event_date_status IS 
'Composite index for team-based booking queries. Supports team dashboard views showing bookings by date and status.';

-- Composite index for provider + team + status queries
-- Optimized for: "Get all bookings for a team within a provider, filtered by status"
CREATE INDEX IF NOT EXISTS idx_bookings_provider_team_status 
ON public.bookings(provider_id, team_id, status)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_provider_team_status IS 
'Composite index for provider-scoped team booking queries. Supports filtering by team and status.';

-- Composite index for location + team queries
-- Optimized for: "Get all bookings for a team at a specific location"
CREATE INDEX IF NOT EXISTS idx_bookings_location_team 
ON public.bookings(service_location_id, team_id)
WHERE service_location_id IS NOT NULL AND team_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_location_team IS 
'Composite index for location-team booking queries. Supports multi-team location scenarios.';

-- ============================================================================
-- PHASE 4: ADD CHECK CONSTRAINT (OPTIONAL - COMMENTED OUT)
-- ============================================================================

-- Optional: Ensure team belongs to same provider as booking
-- Uncomment if you want to enforce this constraint
-- Note: This may be too restrictive if you want to support cross-provider teams in the future

-- ALTER TABLE public.bookings
-- ADD CONSTRAINT bookings_team_same_provider CHECK (
--   team_id IS NULL OR
--   EXISTS (
--     SELECT 1 
--     FROM public.teams t
--     WHERE t.id = bookings.team_id
--       AND t.provider_id = bookings.provider_id
--   )
-- );

-- COMMENT ON CONSTRAINT bookings_team_same_provider ON public.bookings IS 
-- 'Ensures team belongs to same provider as booking. Prevents cross-provider team assignments.';

-- ============================================================================
-- PHASE 5: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'bookings' 
--   AND column_name = 'team_id';

-- Verify foreign key constraint:
-- SELECT conname, contype, confdeltype
-- FROM pg_constraint
-- WHERE conname = 'bookings_team_id_fkey';

-- Verify indexes were created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings'
--   AND indexname LIKE '%team%'
-- ORDER BY indexname;

-- Test assigning a booking to a team:
-- UPDATE public.bookings
-- SET team_id = 'team-uuid', service_location_id = 'location-uuid'
-- WHERE id = 'booking-uuid'
-- RETURNING *;

-- Test querying team bookings:
-- SELECT b.id, b.event_date, b.status, t.name as team_name, sl.city as location
-- FROM public.bookings b
-- JOIN public.teams t ON t.id = b.team_id
-- LEFT JOIN public.service_locations sl ON sl.id = b.service_location_id
-- WHERE b.team_id = 'team-uuid'
--   AND b.event_date >= CURRENT_DATE
--   AND b.status IN ('pending', 'confirmed')
-- ORDER BY b.event_date DESC;

-- Test query performance (should use idx_bookings_team_event_date_status):
-- EXPLAIN ANALYZE
-- SELECT id, event_date, status
-- FROM public.bookings
-- WHERE team_id = 'team-uuid'
--   AND event_date >= CURRENT_DATE
--   AND status = 'confirmed'
-- ORDER BY event_date DESC;

