-- Remove global service_radius column from catering_providers
-- Migration: 20250124000001_remove_global_service_radius.sql
--
-- IMPORTANT: This migration should ONLY be applied AFTER the application code
-- has been fully updated and deployed to use per-location service_radius.
-- 
-- DO NOT apply this migration yet. It's prepared here for future use.
--
-- To apply this migration later:
-- 1. Ensure all application code is updated to use service_locations.service_radius
-- 2. Ensure all application code is updated to use catering_providers.max_service_radius
-- 3. Verify that no code references catering_providers.service_radius
-- 4. Then apply this migration via Supabase dashboard or CLI

-- Drop the old global service_radius column
-- This column is now replaced by:
-- - service_locations.service_radius (per-location radius)
-- - catering_providers.max_service_radius (maximum allowed radius)
ALTER TABLE public.catering_providers
DROP COLUMN IF EXISTS service_radius;

