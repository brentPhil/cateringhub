-- ============================================================================
-- ADD TEAM ASSIGNMENT TO WORKER PROFILES
-- ============================================================================
-- Migration: 20251101000008_add_team_to_worker_profiles.sql
-- Date: November 1, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Add team_id column to worker_profiles table to support team-based
--   dispatch system for non-login workers. This allows workers to be
--   assigned to operational teams just like staff members (provider_members).
--
-- Changes:
--   1. Add team_id column to worker_profiles table
--   2. Create foreign key constraint to teams table
--   3. Create index for team-based queries
--   4. Update RLS policies if needed
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: ADD TEAM_ID COLUMN
-- ============================================================================

-- Add team_id column to worker_profiles table
ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add column comment
COMMENT ON COLUMN public.worker_profiles.team_id IS 'Reference to the operational team this worker is assigned to';

-- ============================================================================
-- PHASE 2: CREATE INDEX
-- ============================================================================

-- Index for querying workers by team
CREATE INDEX IF NOT EXISTS idx_worker_profiles_team_id 
ON public.worker_profiles(team_id) WHERE team_id IS NOT NULL;

-- ============================================================================
-- PHASE 3: VERIFY CONSTRAINTS
-- ============================================================================

-- Verify the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'worker_profiles_team_id_fkey'
    AND table_name = 'worker_profiles'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint worker_profiles_team_id_fkey was not created';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these manually to verify migration)
-- ============================================================================

-- Check column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'worker_profiles' AND column_name = 'team_id';

-- Check foreign key constraint
-- SELECT constraint_name, table_name, column_name
-- FROM information_schema.key_column_usage
-- WHERE table_name = 'worker_profiles' AND column_name = 'team_id';

-- Check index was created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'worker_profiles' AND indexname = 'idx_worker_profiles_team_id';

