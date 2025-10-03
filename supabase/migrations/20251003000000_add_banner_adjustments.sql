-- Add banner_adjustments column to catering_providers table
-- This stores the user's banner image adjustments (zoom, position, rotation)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS banner_adjustments JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.catering_providers.banner_adjustments IS 'Stores banner image adjustment settings as JSON: { zoom: number (50-200%), offsetX: number (px), offsetY: number (px), rotation: 0|90|180|270 }';

-- Create an index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_catering_providers_banner_adjustments 
ON public.catering_providers USING GIN (banner_adjustments);

