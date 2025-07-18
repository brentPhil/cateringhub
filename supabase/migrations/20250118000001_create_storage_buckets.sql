-- Create storage bucket for provider assets (logos, menus, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-assets',
  'provider-assets',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
);

-- Create RLS policies for provider-assets bucket
CREATE POLICY "Users can upload their own provider assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own provider assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'provider-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own provider assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'provider-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own provider assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'provider-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to provider assets (for displaying logos and menus)
CREATE POLICY "Public can view provider assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-assets');

-- Allow admins to manage all provider assets
CREATE POLICY "Admins can manage all provider assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'provider-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
