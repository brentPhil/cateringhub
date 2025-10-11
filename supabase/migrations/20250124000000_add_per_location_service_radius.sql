-- Add per-location service radius support
-- Migration: 20250124000000_add_per_location_service_radius.sql

-- Step 1: Add max_service_radius to catering_providers table
-- This sets the maximum allowed service radius for any location owned by this provider
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS max_service_radius INTEGER NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.catering_providers.max_service_radius IS 'Maximum allowed service radius (in km) for any location owned by this provider';

-- Step 2: Add service_radius to service_locations table
-- This allows each location to have its own service radius
ALTER TABLE public.service_locations
ADD COLUMN IF NOT EXISTS service_radius INTEGER NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.service_locations.service_radius IS 'Service radius (in km) for this specific location';

-- Step 3: Backfill service_locations.service_radius from existing catering_providers.service_radius
-- This migrates the existing global service radius to each location
UPDATE public.service_locations sl
SET service_radius = COALESCE(
  (SELECT service_radius FROM public.catering_providers WHERE id = sl.provider_id),
  50
)
WHERE service_radius = 50; -- Only update locations that still have the default value

-- Step 4: Create function to enforce max_service_radius constraint
-- This ensures that no location's service_radius exceeds the provider's max_service_radius
CREATE OR REPLACE FUNCTION public.enforce_max_service_radius()
RETURNS TRIGGER AS $$
DECLARE
  provider_max_radius INTEGER;
BEGIN
  -- Get the provider's max_service_radius
  SELECT max_service_radius INTO provider_max_radius
  FROM public.catering_providers
  WHERE id = NEW.provider_id;

  -- Check if the location's service_radius exceeds the provider's max
  IF NEW.service_radius > provider_max_radius THEN
    RAISE EXCEPTION 'service_radius (%) exceeds provider max_service_radius (%)', 
      NEW.service_radius, provider_max_radius;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.enforce_max_service_radius() IS 'Ensures that location service_radius does not exceed provider max_service_radius';

-- Step 5: Create trigger to enforce max_service_radius on INSERT and UPDATE
CREATE TRIGGER trigger_enforce_max_service_radius
  BEFORE INSERT OR UPDATE OF service_radius ON public.service_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_service_radius();

-- Step 6: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_locations_service_radius 
  ON public.service_locations(service_radius);

-- Step 7: Add validation constraints
-- Ensure service_radius is positive
ALTER TABLE public.service_locations
ADD CONSTRAINT check_service_radius_positive 
  CHECK (service_radius > 0);

-- Ensure max_service_radius is positive
ALTER TABLE public.catering_providers
ADD CONSTRAINT check_max_service_radius_positive 
  CHECK (max_service_radius > 0);

-- Note: The old global service_radius column in catering_providers will be dropped
-- in a future migration after the application code is fully updated and deployed.
-- This ensures a safe rollback path if needed.

