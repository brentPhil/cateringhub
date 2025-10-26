-- Add social_media_links column to providers table
-- Migration: 20251026000000_add_social_media_links_to_providers.sql
-- Purpose: Add the missing social_media_links column that was defined in catering_providers
--          but not migrated to the providers table during the merge

BEGIN;

-- Add social_media_links column to providers table
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.providers.social_media_links IS 'JSON object storing social media links (facebook, instagram, website, tiktok)';

-- Create index for JSONB queries if needed in the future
CREATE INDEX IF NOT EXISTS idx_providers_social_media_links
ON public.providers USING GIN(social_media_links);

COMMIT;

