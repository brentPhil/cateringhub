-- ============================================================================
-- CREATE TEAMS TABLE
-- ============================================================================
-- Migration: 20251101000002_create_teams_table.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Create teams table
--
-- Purpose:
--   Create teams table to support team-based assignment model. Each team
--   belongs to a service location and has capacity limits for managing
--   concurrent events and daily workload.
--
-- Features:
--   - Teams are scoped to a specific service location
--   - Capacity management (daily capacity and max concurrent events)
--   - Soft delete support via status field
--   - Audit trail with created_at/updated_at timestamps
--   - RLS policies for provider-scoped access
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE ENUM TYPE FOR TEAM STATUS
-- ============================================================================

-- Create team_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.team_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.team_status IS 
'Status of a team: active (operational), inactive (temporarily disabled), archived (soft deleted)';

-- ============================================================================
-- PHASE 2: CREATE TEAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_location_id UUID NOT NULL REFERENCES public.service_locations(id) ON DELETE CASCADE,
  
  -- Team details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Capacity management
  daily_capacity INTEGER CHECK (daily_capacity IS NULL OR daily_capacity >= 1),
  max_concurrent_events INTEGER CHECK (max_concurrent_events IS NULL OR max_concurrent_events >= 1),
  
  -- Status
  status public.team_status NOT NULL DEFAULT 'active',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT teams_name_not_empty CHECK (TRIM(name) <> ''),
  CONSTRAINT teams_capacity_logical CHECK (
    max_concurrent_events IS NULL OR 
    daily_capacity IS NULL OR 
    max_concurrent_events <= daily_capacity
  )
);

-- Add table comment
COMMENT ON TABLE public.teams IS 
'Teams assigned to service locations for handling bookings. Supports team-based dispatch and capacity management.';

-- Add column comments
COMMENT ON COLUMN public.teams.id IS 'Unique identifier for the team';
COMMENT ON COLUMN public.teams.provider_id IS 'Provider organization that owns this team';
COMMENT ON COLUMN public.teams.service_location_id IS 'Service location where this team operates';
COMMENT ON COLUMN public.teams.name IS 'Team name (e.g., "Metro Manila Team", "Cebu Kitchen Team")';
COMMENT ON COLUMN public.teams.description IS 'Optional description of team responsibilities or coverage area';
COMMENT ON COLUMN public.teams.daily_capacity IS 'Maximum number of events this team can handle per day (NULL = unlimited)';
COMMENT ON COLUMN public.teams.max_concurrent_events IS 'Maximum number of simultaneous events this team can handle (NULL = unlimited)';
COMMENT ON COLUMN public.teams.status IS 'Current status: active, inactive, or archived';
COMMENT ON COLUMN public.teams.created_by IS 'User who created this team';

-- ============================================================================
-- PHASE 3: CREATE INDEXES
-- ============================================================================

-- Index for querying teams by provider
CREATE INDEX IF NOT EXISTS idx_teams_provider_id 
ON public.teams(provider_id);

-- Index for querying teams by service location
CREATE INDEX IF NOT EXISTS idx_teams_service_location_id 
ON public.teams(service_location_id);

-- Composite index for provider + status queries (most common)
CREATE INDEX IF NOT EXISTS idx_teams_provider_status 
ON public.teams(provider_id, status);

-- Composite index for location + status queries
CREATE INDEX IF NOT EXISTS idx_teams_location_status 
ON public.teams(service_location_id, status);

-- Add index comments
COMMENT ON INDEX idx_teams_provider_id IS 'Index for querying all teams belonging to a provider';
COMMENT ON INDEX idx_teams_service_location_id IS 'Index for querying teams at a specific service location';
COMMENT ON INDEX idx_teams_provider_status IS 'Composite index for filtering provider teams by status';
COMMENT ON INDEX idx_teams_location_status IS 'Composite index for filtering location teams by status';

-- ============================================================================
-- PHASE 4: CREATE UNIQUE CONSTRAINT
-- ============================================================================

-- Ensure unique team names per service location
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_location_name_unique 
ON public.teams(service_location_id, LOWER(TRIM(name)))
WHERE status <> 'archived';

COMMENT ON INDEX idx_teams_location_name_unique IS 
'Ensures unique team names per service location (case-insensitive, excluding archived teams)';

-- ============================================================================
-- PHASE 5: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_teams_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_teams_updated_at ON public.teams;
CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teams_updated_at();

COMMENT ON FUNCTION public.update_teams_updated_at() IS 
'Automatically updates the updated_at timestamp when a team record is modified';

-- ============================================================================
-- PHASE 6: ENABLE RLS
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 7: CREATE RLS POLICIES
-- ============================================================================

-- Policy: Provider members can view teams for their provider
CREATE POLICY "Provider members can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = teams.provider_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
);

-- Policy: Managers and above can create teams
CREATE POLICY "Managers can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

-- Policy: Managers and above can update teams
CREATE POLICY "Managers can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
)
WITH CHECK (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

-- Policy: Managers and above can delete teams (soft delete via status update recommended)
CREATE POLICY "Managers can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (
  public.is_provider_member(provider_id, auth.uid(), 'manager'::public.provider_role)
);

-- Add policy comments
COMMENT ON POLICY "Provider members can view teams" ON public.teams IS 
'Allows all active provider members to view teams for their provider';

COMMENT ON POLICY "Managers can create teams" ON public.teams IS 
'Allows managers and above to create new teams for their provider';

COMMENT ON POLICY "Managers can update teams" ON public.teams IS 
'Allows managers and above to update team details and capacity settings';

COMMENT ON POLICY "Managers can delete teams" ON public.teams IS 
'Allows managers and above to delete teams (soft delete via status=archived is recommended)';

-- ============================================================================
-- PHASE 8: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify table was created:
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'teams';

-- Verify columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'teams'
-- ORDER BY ordinal_position;

-- Verify constraints:
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.teams'::regclass;

-- Verify indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'teams'
-- ORDER BY indexname;

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'teams';

-- Test creating a team:
-- INSERT INTO public.teams (provider_id, service_location_id, name, daily_capacity, max_concurrent_events)
-- VALUES ('provider-uuid', 'location-uuid', 'Test Team', 5, 3)
-- RETURNING *;

