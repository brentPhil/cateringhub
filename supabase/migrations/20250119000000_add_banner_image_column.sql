-- Add banner_image column to catering_providers table
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS banner_image TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.catering_providers.banner_image IS 'URL of the provider banner image stored in Supabase Storage';

