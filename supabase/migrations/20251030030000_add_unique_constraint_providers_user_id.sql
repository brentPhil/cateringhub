-- ============================================================================
-- ADD UNIQUE CONSTRAINT ON providers.user_id
-- ============================================================================
-- Migration: 20251030030000_add_unique_constraint_providers_user_id.sql
-- Purpose: Add unique constraint to prevent multiple provider profiles per user
-- This will make the unique violation error more explicit and prevent race conditions
-- ============================================================================

BEGIN;

-- Add unique constraint on user_id
-- This ensures one user can only have one provider profile
ALTER TABLE public.providers 
ADD CONSTRAINT providers_user_id_unique UNIQUE (user_id);

-- Add comment
COMMENT ON CONSTRAINT providers_user_id_unique ON public.providers IS 
'Ensures each user can only have one provider profile';

COMMIT;

