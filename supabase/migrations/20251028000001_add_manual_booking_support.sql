-- ============================================================================
-- ADD MANUAL BOOKING SUPPORT TO BOOKINGS TABLE
-- ============================================================================
-- Migration: 20251028000001_add_manual_booking_support.sql
-- Date: October 28, 2025
-- Task: Task 1 - Manual Bookings Database Schema & Constraints
--
-- Purpose:
--   Add columns and constraints to support manual booking creation with
--   clear attribution, validation, and performance optimization.
--
-- Deliverables:
--   - Add source enum column ('auto' or 'manual')
--   - Add created_by column (FK to auth.users)
--   - Add notes column (text, nullable)
--   - Create partial index on source
--   - Create composite indexes for performance
--   - Add check constraint for event_date validation
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE ENUM TYPE FOR BOOKING SOURCE
-- ============================================================================

-- Create booking_source enum type
DO $$ BEGIN
  CREATE TYPE public.booking_source AS ENUM ('auto', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.booking_source IS 'Source of booking creation: auto (from customer) or manual (created by provider)';

-- ============================================================================
-- PHASE 2: ADD NEW COLUMNS TO BOOKINGS TABLE
-- ============================================================================

-- Add source column (defaults to 'auto' for existing bookings)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS source public.booking_source NOT NULL DEFAULT 'auto';

-- Add created_by column (nullable for existing bookings, required for manual bookings)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add notes column for additional information
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add column comments
COMMENT ON COLUMN public.bookings.source IS 'Source of booking: auto (customer-initiated) or manual (provider-created)';
COMMENT ON COLUMN public.bookings.created_by IS 'User who created the booking (required for manual bookings, null for auto bookings)';
COMMENT ON COLUMN public.bookings.notes IS 'Additional notes or special instructions for the booking';

-- ============================================================================
-- PHASE 3: ADD CONSTRAINTS
-- ============================================================================

-- Constraint: Manual bookings must have created_by
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_manual_requires_created_by 
CHECK (
  (source = 'manual' AND created_by IS NOT NULL) OR 
  (source = 'auto')
);

-- Constraint: Event date must be in the future for active bookings
-- Allow past dates only for cancelled or completed bookings
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_event_date_future_check
CHECK (
  event_date >= CURRENT_DATE OR 
  status IN ('cancelled', 'completed')
);

COMMENT ON CONSTRAINT bookings_manual_requires_created_by ON public.bookings IS 
'Ensures manual bookings have a created_by user for audit trail';

COMMENT ON CONSTRAINT bookings_event_date_future_check ON public.bookings IS 
'Prevents scheduling events in the past unless booking is cancelled or completed';

-- ============================================================================
-- PHASE 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Partial index on source column (for filtering manual vs auto bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_source 
ON public.bookings(source);

-- Composite index for provider + event_date + status queries (most common query pattern)
-- This index already exists as idx_bookings_provider_date, but we need to add status
-- Drop the old one and create a new composite index
DROP INDEX IF EXISTS public.idx_bookings_provider_date;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_event_date_status 
ON public.bookings(provider_id, event_date DESC, status);

-- Index on event_date alone (for calendar views and date-based queries)
-- This already exists as idx_bookings_event_date, ensure it's optimized for DESC order
DROP INDEX IF EXISTS public.idx_bookings_event_date;

CREATE INDEX IF NOT EXISTS idx_bookings_event_date_desc 
ON public.bookings(event_date DESC);

-- Index on created_by for audit queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_by 
ON public.bookings(created_by) 
WHERE created_by IS NOT NULL;

-- Composite index for provider + source filtering
CREATE INDEX IF NOT EXISTS idx_bookings_provider_source 
ON public.bookings(provider_id, source);

COMMENT ON INDEX idx_bookings_source IS 'Partial index for filtering bookings by source (auto vs manual)';
COMMENT ON INDEX idx_bookings_provider_event_date_status IS 'Composite index for provider booking list queries with date sorting and status filtering';
COMMENT ON INDEX idx_bookings_event_date_desc IS 'Index for date-based queries and calendar views (descending order)';
COMMENT ON INDEX idx_bookings_created_by IS 'Index for audit trail queries by creator';
COMMENT ON INDEX idx_bookings_provider_source IS 'Composite index for filtering provider bookings by source';

-- ============================================================================
-- PHASE 5: UPDATE EXISTING DATA
-- ============================================================================

-- Set created_by to NULL for all existing bookings (they are auto bookings)
-- This is already the default, but making it explicit for clarity
UPDATE public.bookings 
SET created_by = NULL 
WHERE source = 'auto' AND created_by IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify schema changes:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'bookings'
-- ORDER BY ordinal_position;

-- Verify indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'bookings' AND schemaname = 'public'
-- ORDER BY indexname;

-- Verify constraints:
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.bookings'::regclass
-- ORDER BY conname;

-- Test query performance (should use idx_bookings_provider_event_date_status):
-- EXPLAIN ANALYZE
-- SELECT * FROM public.bookings
-- WHERE provider_id = 'some-uuid'
--   AND event_date >= CURRENT_DATE
-- ORDER BY event_date DESC
-- LIMIT 25;

