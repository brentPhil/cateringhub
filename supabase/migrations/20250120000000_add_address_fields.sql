-- Add address fields to catering_providers table
-- These fields will store structured address data for provider profiles

-- Add email column (optional contact email)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add street_address column
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS street_address TEXT;

-- Add city column (stores PSGC mun_code like "012801000")
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add barangay column (stores synthetic ID like "012801000-0")
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS barangay TEXT;

-- Add postal_code column
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add tagline column (short business tagline, max 100 chars)
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.catering_providers.email IS 'Optional contact email for the business';
COMMENT ON COLUMN public.catering_providers.street_address IS 'Street address of the business';
COMMENT ON COLUMN public.catering_providers.city IS 'City/municipality code from PSGC (Philippine Standard Geographic Code)';
COMMENT ON COLUMN public.catering_providers.barangay IS 'Barangay identifier in format: mun_code-index';
COMMENT ON COLUMN public.catering_providers.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.catering_providers.tagline IS 'Short business tagline (max 100 characters)';

