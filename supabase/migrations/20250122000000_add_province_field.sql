-- Add province field to catering_providers table
-- Migration: 20250122000000_add_province_field.sql

-- Add province column (stores PSGC province code like "0837")
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS province TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.catering_providers.province IS 'Province code from PSGC (Philippine Standard Geographic Code)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_catering_providers_province ON public.catering_providers(province);

