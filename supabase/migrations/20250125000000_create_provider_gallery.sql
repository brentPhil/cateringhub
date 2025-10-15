-- Create provider_gallery_images table for photo gallery feature
-- Migration: 20250125000000_create_provider_gallery.sql

-- Create the provider_gallery_images table
CREATE TABLE IF NOT EXISTS public.provider_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.catering_providers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.provider_gallery_images IS 'Gallery images for catering providers showcasing their work, events, and menus';
COMMENT ON COLUMN public.provider_gallery_images.provider_id IS 'Foreign key to catering_providers table';
COMMENT ON COLUMN public.provider_gallery_images.image_url IS 'Public URL of the gallery image stored in Supabase Storage';
COMMENT ON COLUMN public.provider_gallery_images.display_order IS 'Order in which images should be displayed (lower numbers first)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_provider_id ON public.provider_gallery_images(provider_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_display_order ON public.provider_gallery_images(provider_id, display_order);

-- Add featured_image_url column to catering_providers table
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

COMMENT ON COLUMN public.catering_providers.featured_image_url IS 'URL of the featured image (must exist in provider_gallery_images)';

-- Add RLS (Row Level Security) policies
ALTER TABLE public.provider_gallery_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view gallery images (public)
CREATE POLICY "Anyone can view gallery images"
  ON public.provider_gallery_images
  FOR SELECT
  USING (true);

-- Policy: Providers can insert their own gallery images
CREATE POLICY "Providers can insert own gallery images"
  ON public.provider_gallery_images
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Providers can update their own gallery images
CREATE POLICY "Providers can update own gallery images"
  ON public.provider_gallery_images
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Providers can delete their own gallery images
CREATE POLICY "Providers can delete own gallery images"
  ON public.provider_gallery_images
  FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.catering_providers WHERE user_id = (SELECT auth.uid())
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gallery_image_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_gallery_image_timestamp
  BEFORE UPDATE ON public.provider_gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gallery_image_updated_at();

-- Create a function to validate featured image exists in gallery
CREATE OR REPLACE FUNCTION public.validate_featured_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If featured_image_url is being set (not null)
  IF NEW.featured_image_url IS NOT NULL THEN
    -- Check if the image exists in the provider's gallery
    IF NOT EXISTS (
      SELECT 1 FROM public.provider_gallery_images
      WHERE provider_id = NEW.id
      AND image_url = NEW.featured_image_url
    ) THEN
      RAISE EXCEPTION 'Featured image must exist in the provider''s gallery';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate featured image
CREATE TRIGGER trigger_validate_featured_image
  BEFORE INSERT OR UPDATE ON public.catering_providers
  FOR EACH ROW
  WHEN (NEW.featured_image_url IS NOT NULL)
  EXECUTE FUNCTION public.validate_featured_image();

-- Create a function to clear featured image when gallery image is deleted
CREATE OR REPLACE FUNCTION public.clear_featured_image_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If the deleted image was a featured image, clear it from catering_providers
  UPDATE public.catering_providers
  SET featured_image_url = NULL
  WHERE id = OLD.provider_id
  AND featured_image_url = OLD.image_url;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clear featured image on gallery image deletion
CREATE TRIGGER trigger_clear_featured_image_on_delete
  AFTER DELETE ON public.provider_gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_featured_image_on_delete();

