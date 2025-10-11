-- Create service_locations table for multi-location support
-- Migration: 20250123000000_create_service_locations.sql

-- Create the service_locations table
CREATE TABLE IF NOT EXISTS public.service_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.catering_providers(id) ON DELETE CASCADE,
  
  -- Location fields (moved from catering_providers)
  province TEXT,
  city TEXT,
  barangay TEXT,
  street_address TEXT,
  postal_code TEXT,
  
  -- New fields for multi-location support
  is_primary BOOLEAN NOT NULL DEFAULT false,
  landmark TEXT,
  service_area_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.service_locations IS 'Service locations for catering providers (supports multiple locations per provider)';
COMMENT ON COLUMN public.service_locations.provider_id IS 'Foreign key to catering_providers table';
COMMENT ON COLUMN public.service_locations.province IS 'Province code from PSGC (Philippine Standard Geographic Code)';
COMMENT ON COLUMN public.service_locations.city IS 'City/municipality code from PSGC';
COMMENT ON COLUMN public.service_locations.barangay IS 'Barangay identifier';
COMMENT ON COLUMN public.service_locations.is_primary IS 'Indicates if this is the primary/main service location';
COMMENT ON COLUMN public.service_locations.landmark IS 'Nearby landmark for easier navigation';
COMMENT ON COLUMN public.service_locations.service_area_notes IS 'Special notes about serving this area';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_locations_provider_id ON public.service_locations(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_is_primary ON public.service_locations(is_primary);
CREATE INDEX IF NOT EXISTS idx_service_locations_provider_primary ON public.service_locations(provider_id, is_primary);

-- Migrate existing location data from catering_providers to service_locations
-- Only migrate if the provider has location data (city is not null)
INSERT INTO public.service_locations (
  provider_id,
  province,
  city,
  barangay,
  street_address,
  postal_code,
  is_primary,
  created_at,
  updated_at
)
SELECT 
  id as provider_id,
  province,
  city,
  barangay,
  street_address,
  postal_code,
  true as is_primary, -- Mark migrated locations as primary
  created_at,
  updated_at
FROM public.catering_providers
WHERE city IS NOT NULL -- Only migrate providers with location data
ON CONFLICT DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can view their own locations
CREATE POLICY "Providers can view own locations"
  ON public.service_locations
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: Providers can insert their own locations
CREATE POLICY "Providers can insert own locations"
  ON public.service_locations
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: Providers can update their own locations
CREATE POLICY "Providers can update own locations"
  ON public.service_locations
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = auth.uid()
    )
  );

-- Policy: Providers can delete their own locations
CREATE POLICY "Providers can delete own locations"
  ON public.service_locations
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = auth.uid()
    )
  );

-- Create a function to ensure only one primary location per provider
CREATE OR REPLACE FUNCTION public.ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this location as primary, unset all other primary locations for this provider
  IF NEW.is_primary = true THEN
    UPDATE public.service_locations
    SET is_primary = false
    WHERE provider_id = NEW.provider_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary location
CREATE TRIGGER trigger_ensure_single_primary_location
  BEFORE INSERT OR UPDATE ON public.service_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_location();

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_service_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_service_location_timestamp
  BEFORE UPDATE ON public.service_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_location_updated_at();

