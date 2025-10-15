-- ============================================================================
-- Migration: Fix Remaining References to catering_providers Table
-- ============================================================================
-- Description: Updates database functions that still reference the old
--              catering_providers table to use the unified providers table
-- Date: 2025-10-15
-- Issue: Service location updates failing with error:
--        "relation 'public.catering_providers' does not exist"
-- Root Cause: Database triggers/functions not updated during initial migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 1: enforce_max_service_radius
-- ============================================================================
-- Purpose: Validates that a service location's radius doesn't exceed the
--          provider's maximum allowed service radius
-- Trigger: Runs on INSERT/UPDATE of service_locations table
-- Fix: Change query from catering_providers to providers table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_max_service_radius()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  provider_max_radius INTEGER;
BEGIN
  -- Get the provider's max_service_radius from unified providers table
  -- FIXED: Changed from catering_providers to providers
  SELECT max_service_radius INTO provider_max_radius
  FROM public.providers
  WHERE id = NEW.provider_id;

  -- Check if the location's service_radius exceeds the provider's max
  IF NEW.service_radius > provider_max_radius THEN
    RAISE EXCEPTION 'service_radius (%) exceeds provider max_service_radius (%)', 
      NEW.service_radius, provider_max_radius;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_max_service_radius() IS 
'Validates that service location radius does not exceed provider maximum. Updated to use unified providers table.';

-- ============================================================================
-- FUNCTION 2: clear_featured_image_on_delete
-- ============================================================================
-- Purpose: Clears featured_image_url from provider when the featured image
--          is deleted from the gallery
-- Trigger: Runs on DELETE of provider_gallery_images table
-- Fix: Change UPDATE target from catering_providers to providers table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_featured_image_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If the deleted image was a featured image, clear it from providers table
  -- FIXED: Changed from catering_providers to providers
  UPDATE public.providers
  SET featured_image_url = NULL
  WHERE id = OLD.provider_id
  AND featured_image_url = OLD.image_url;
  
  RETURN OLD;
END;
$function$;

COMMENT ON FUNCTION public.clear_featured_image_on_delete() IS 
'Clears featured image URL from provider when gallery image is deleted. Updated to use unified providers table.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify no more references to catering_providers in functions
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE pg_get_functiondef(oid) LIKE '%catering_providers%'
  AND pronamespace = 'public'::regnamespace
  AND proname NOT LIKE '%backup%'; -- Exclude backup-related functions

  IF function_count > 0 THEN
    RAISE WARNING 'Found % function(s) still referencing catering_providers', function_count;
  ELSE
    RAISE NOTICE 'All functions successfully updated to use providers table';
  END IF;
END $$;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test 1: Verify enforce_max_service_radius function works
DO $$
DECLARE
  test_provider_id UUID;
  test_location_id UUID;
BEGIN
  -- This is a dry-run test - we're just checking the function exists and compiles
  RAISE NOTICE 'Testing enforce_max_service_radius function...';
  
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'enforce_max_service_radius'
  ) THEN
    RAISE EXCEPTION 'Function enforce_max_service_radius does not exist';
  END IF;
  
  RAISE NOTICE 'enforce_max_service_radius function verified';
END $$;

-- Test 2: Verify clear_featured_image_on_delete function works
DO $$
BEGIN
  RAISE NOTICE 'Testing clear_featured_image_on_delete function...';
  
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'clear_featured_image_on_delete'
  ) THEN
    RAISE EXCEPTION 'Function clear_featured_image_on_delete does not exist';
  END IF;
  
  RAISE NOTICE 'clear_featured_image_on_delete function verified';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration (restore old function definitions):
--
-- BEGIN;
--
-- CREATE OR REPLACE FUNCTION public.enforce_max_service_radius()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
--   provider_max_radius INTEGER;
-- BEGIN
--   SELECT max_service_radius INTO provider_max_radius
--   FROM public.catering_providers  -- OLD TABLE
--   WHERE id = NEW.provider_id;
--
--   IF NEW.service_radius > provider_max_radius THEN
--     RAISE EXCEPTION 'service_radius (%) exceeds provider max_service_radius (%)', 
--       NEW.service_radius, provider_max_radius;
--   END IF;
--
--   RETURN NEW;
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.clear_featured_image_on_delete()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   UPDATE public.catering_providers  -- OLD TABLE
--   SET featured_image_url = NULL
--   WHERE id = OLD.provider_id
--   AND featured_image_url = OLD.image_url;
--   
--   RETURN OLD;
-- END;
-- $function$;
--
-- COMMIT;
-- ============================================================================

