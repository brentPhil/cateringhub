-- ============================================================================
-- ADD TEAM LINKAGE TO PROVIDER MEMBERS
-- ============================================================================
-- Migration: 20251101000003_add_team_to_provider_members.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Link members to teams
--
-- Purpose:
--   Add team_id column to provider_members table to assign team members
--   to specific teams. This enables team-based access control and
--   workload distribution.
--
-- Changes:
--   - Add nullable team_id column to provider_members
--   - Add foreign key constraint to teams table
--   - Create indexes for efficient team membership queries
--   - Add column comment for documentation
--
-- Notes:
--   - Column is nullable to support gradual migration
--   - Future enhancement: support multi-team membership via junction table
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD COLUMN
-- ============================================================================

-- Add team_id column (nullable to support gradual migration and unassigned members)
ALTER TABLE public.provider_members 
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add column comment
COMMENT ON COLUMN public.provider_members.team_id IS 
'Team assignment for this member. NULL = unassigned or manager/admin role. Part of team-based assignment model.';

-- ============================================================================
-- PHASE 2: ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key to teams table
-- ON DELETE SET NULL to preserve member record if team is deleted
ALTER TABLE public.provider_members
ADD CONSTRAINT provider_members_team_id_fkey 
FOREIGN KEY (team_id) 
REFERENCES public.teams(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT provider_members_team_id_fkey ON public.provider_members IS 
'Links member to team. SET NULL on delete to preserve member record.';

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying members by team
CREATE INDEX IF NOT EXISTS idx_provider_members_team_id 
ON public.provider_members(team_id)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_provider_members_team_id IS 
'Partial index for querying team members. Excludes unassigned members.';

-- Composite index for provider + team queries
-- Optimized for: "Get all members of a team within a provider"
CREATE INDEX IF NOT EXISTS idx_provider_members_provider_team 
ON public.provider_members(provider_id, team_id)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_provider_members_provider_team IS 
'Composite index for provider-scoped team membership queries. Supports team roster views.';

-- Composite index for team + status queries
-- Optimized for: "Get all active members of a team"
CREATE INDEX IF NOT EXISTS idx_provider_members_team_status 
ON public.provider_members(team_id, status)
WHERE team_id IS NOT NULL;

COMMENT ON INDEX idx_provider_members_team_status IS 
'Composite index for filtering team members by status. Supports active member queries.';

-- ============================================================================
-- PHASE 4: ADD CHECK CONSTRAINT
-- ============================================================================

-- Ensure team belongs to same provider as member
-- This prevents assigning members to teams from different providers
ALTER TABLE public.provider_members
ADD CONSTRAINT provider_members_team_same_provider CHECK (
  team_id IS NULL OR
  EXISTS (
    SELECT 1 
    FROM public.teams t
    WHERE t.id = provider_members.team_id
      AND t.provider_id = provider_members.provider_id
  )
);

COMMENT ON CONSTRAINT provider_members_team_same_provider ON public.provider_members IS 
'Ensures team belongs to same provider as member. Prevents cross-provider team assignments.';

-- ============================================================================
-- PHASE 5: VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Verify column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'provider_members' 
--   AND column_name = 'team_id';

-- Verify foreign key constraint:
-- SELECT conname, contype, confdeltype
-- FROM pg_constraint
-- WHERE conname = 'provider_members_team_id_fkey';

-- Verify indexes were created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'provider_members'
--   AND indexname LIKE '%team%'
-- ORDER BY indexname;

-- Verify check constraint:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'provider_members_team_same_provider';

-- Test assigning a member to a team:
-- UPDATE public.provider_members
-- SET team_id = 'team-uuid'
-- WHERE id = 'member-uuid'
-- RETURNING *;

-- Test querying team members:
-- SELECT pm.id, pm.user_id, pm.role, pm.status, t.name as team_name
-- FROM public.provider_members pm
-- JOIN public.teams t ON t.id = pm.team_id
-- WHERE pm.provider_id = 'provider-uuid'
--   AND pm.team_id = 'team-uuid'
--   AND pm.status = 'active';

