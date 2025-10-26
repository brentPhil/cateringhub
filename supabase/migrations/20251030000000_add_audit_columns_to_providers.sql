-- ============================================================================
-- ADD AUDIT COLUMNS TO PROVIDERS TABLE
-- ============================================================================
-- Migration: 20251030000000_add_audit_columns_to_providers.sql
-- Date: October 30, 2025
-- Purpose: Add audit trail columns to providers table for better tracking
--          of who created/updated records and from where.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: ADD AUDIT COLUMNS
-- ============================================================================

-- Add created_by column (who created the provider)
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_ip column (IP address of creator)
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS created_ip INET;

-- Add updated_by column (who last updated the provider)
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Note: created_at and updated_at already exist

COMMENT ON COLUMN public.providers.created_by IS 
'User ID of the person who created this provider record';

COMMENT ON COLUMN public.providers.created_ip IS 
'IP address from which the provider was created';

COMMENT ON COLUMN public.providers.updated_by IS 
'User ID of the person who last updated this provider record';

-- ============================================================================
-- PHASE 2: BACKFILL CREATED_BY FOR EXISTING RECORDS
-- ============================================================================

-- For existing providers, set created_by to user_id (the owner)
UPDATE public.providers
SET created_by = user_id
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR AUDIT COLUMNS
-- ============================================================================

-- Index for querying providers by creator
CREATE INDEX IF NOT EXISTS idx_providers_created_by
ON public.providers(created_by)
WHERE created_by IS NOT NULL;

-- Index for querying providers by last updater
CREATE INDEX IF NOT EXISTS idx_providers_updated_by
ON public.providers(updated_by)
WHERE updated_by IS NOT NULL;

-- ============================================================================
-- PHASE 4: UPDATE TRIGGER TO SET UPDATED_BY
-- ============================================================================

-- Create or replace the update trigger function to also set updated_by
CREATE OR REPLACE FUNCTION public.update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Set updated_by to current user if not explicitly set
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, no need to recreate it
-- It will now use the updated function

COMMENT ON FUNCTION public.update_providers_updated_at IS 
'Automatically updates updated_at and updated_by columns on provider updates';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE 'Audit columns added to providers table successfully';

COMMIT;

