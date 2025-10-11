-- Add availability and visibility fields to catering_providers table
-- Migration: 20250121000000_add_availability_fields.sql

-- Add profile visibility field
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add service radius field (in kilometers)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 50;

-- Add daily capacity field (max events per day)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS daily_capacity INTEGER DEFAULT 3;

-- Add advance booking days field (minimum notice required)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 7;

-- Add available days field (array of day names)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.catering_providers.is_visible IS 'Whether the provider profile is visible to customers';
COMMENT ON COLUMN public.catering_providers.service_radius IS 'Maximum travel distance in kilometers';
COMMENT ON COLUMN public.catering_providers.daily_capacity IS 'Maximum number of events the provider can handle per day';
COMMENT ON COLUMN public.catering_providers.advance_booking_days IS 'Minimum number of days notice required for bookings';
COMMENT ON COLUMN public.catering_providers.available_days IS 'Array of day names when the provider is available (e.g., ["Monday", "Tuesday"])';

