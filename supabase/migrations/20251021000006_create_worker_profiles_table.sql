-- ============================================================================
-- CREATE WORKER PROFILES TABLE FOR NON-LOGIN STAFF
-- ============================================================================
-- Migration: 20251021000006_create_worker_profiles_table.sql
-- Date: October 21, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Create worker_profiles table to track non-login staff members who can be
--   assigned to shifts without requiring user accounts. This is separate from
--   provider_members which are seat-based users with login access.
--
-- Features:
--   - Store worker information (name, phone, role, certifications, etc.)
--   - Track hourly rates for payroll calculations
--   - Support availability scheduling
--   - Tag-based categorization for filtering
--   - Optional upgrade path to full user accounts
--   - RLS policies scoped to provider membership
--
-- Changes:
--   1. Create worker_status enum type
--   2. Create worker_profiles table
--   3. Add RLS policies for provider member access
--   4. Create indexes for query performance
--   5. Add triggers for updated_at timestamp
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE ENUM TYPE
-- ============================================================================

-- Create worker status enum
CREATE TYPE public.worker_status AS ENUM ('active', 'inactive');

COMMENT ON TYPE public.worker_status IS 'Status of a worker profile: active (available for shifts) or inactive (not available)';

-- ============================================================================
-- PHASE 2: CREATE WORKER PROFILES TABLE
-- ============================================================================

-- Create worker_profiles table
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic information
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  
  -- Categorization and skills
  tags TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  
  -- Compensation
  hourly_rate NUMERIC(10, 2),
  
  -- Availability (JSONB for flexible structure)
  -- Example: {"monday": {"available": true, "hours": "9:00-17:00"}, ...}
  availability JSONB,
  
  -- Internal notes
  notes TEXT,
  
  -- Status
  status public.worker_status NOT NULL DEFAULT 'active',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
);

-- Add table comment
COMMENT ON TABLE public.worker_profiles IS 'Non-login staff members who can be assigned to shifts without user accounts. Does not count toward seat-based billing.';

-- Add column comments
COMMENT ON COLUMN public.worker_profiles.id IS 'Unique identifier for the worker profile';
COMMENT ON COLUMN public.worker_profiles.provider_id IS 'Reference to the provider this worker belongs to';
COMMENT ON COLUMN public.worker_profiles.user_id IS 'Optional reference to user account if worker is promoted to full team member';
COMMENT ON COLUMN public.worker_profiles.name IS 'Full name of the worker';
COMMENT ON COLUMN public.worker_profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN public.worker_profiles.role IS 'Job role or position (e.g., "waiter", "server", "kitchen staff", "driver")';
COMMENT ON COLUMN public.worker_profiles.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.worker_profiles.certifications IS 'Array of certifications (e.g., ["Food Safety", "First Aid"])';
COMMENT ON COLUMN public.worker_profiles.hourly_rate IS 'Pay rate per hour for payroll calculations';
COMMENT ON COLUMN public.worker_profiles.availability IS 'Structured availability data in JSON format';
COMMENT ON COLUMN public.worker_profiles.notes IS 'Internal notes about the worker';
COMMENT ON COLUMN public.worker_profiles.status IS 'Current status: active (available) or inactive (not available)';
COMMENT ON COLUMN public.worker_profiles.user_id IS 'Links to user account if worker was promoted to full team member';

-- ============================================================================
-- PHASE 3: CREATE INDEXES
-- ============================================================================

-- Index for querying workers by provider
CREATE INDEX IF NOT EXISTS idx_worker_profiles_provider_id 
ON public.worker_profiles(provider_id);

-- Index for querying workers by status
CREATE INDEX IF NOT EXISTS idx_worker_profiles_status 
ON public.worker_profiles(status);

-- Index for querying workers by user_id (for promoted workers)
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id 
ON public.worker_profiles(user_id) WHERE user_id IS NOT NULL;

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_worker_profiles_name 
ON public.worker_profiles USING gin(to_tsvector('english', name));

-- Index for filtering by tags
CREATE INDEX IF NOT EXISTS idx_worker_profiles_tags 
ON public.worker_profiles USING gin(tags);

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_worker_profiles_role 
ON public.worker_profiles(role) WHERE role IS NOT NULL;

-- ============================================================================
-- PHASE 4: CREATE TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_worker_profiles_updated_at
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PHASE 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on worker_profiles table
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 6: CREATE RLS POLICIES
-- ============================================================================

-- Policy: Provider members can view workers for their provider
CREATE POLICY "Provider members can view worker profiles"
ON public.worker_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = worker_profiles.provider_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can create workers for their provider
CREATE POLICY "Provider members can create worker profiles"
ON public.worker_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = worker_profiles.provider_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can update workers for their provider
CREATE POLICY "Provider members can update worker profiles"
ON public.worker_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = worker_profiles.provider_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = worker_profiles.provider_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- Policy: Provider members can delete workers for their provider
CREATE POLICY "Provider members can delete worker profiles"
ON public.worker_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.provider_members pm
    WHERE pm.provider_id = worker_profiles.provider_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status = 'active'
  )
);

-- ============================================================================
-- PHASE 7: ADD POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "Provider members can view worker profiles" ON public.worker_profiles IS 
'Allows active provider members to view all worker profiles for their provider';

COMMENT ON POLICY "Provider members can create worker profiles" ON public.worker_profiles IS 
'Allows active provider members to create new worker profiles for their provider';

COMMENT ON POLICY "Provider members can update worker profiles" ON public.worker_profiles IS 
'Allows active provider members to update worker profiles for their provider';

COMMENT ON POLICY "Provider members can delete worker profiles" ON public.worker_profiles IS 
'Allows active provider members to delete worker profiles for their provider';

COMMIT;

