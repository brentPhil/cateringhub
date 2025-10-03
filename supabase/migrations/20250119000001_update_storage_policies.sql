-- Update storage policies for provider-assets bucket to allow authenticated users to upload
-- without requiring specific folder structure

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can upload provider assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own provider assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own provider assets" ON storage.objects;

-- Create new simplified policies for authenticated users
CREATE POLICY "Authenticated users can upload provider assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'provider-assets');

CREATE POLICY "Users can update their own provider assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'provider-assets')
WITH CHECK (bucket_id = 'provider-assets');

CREATE POLICY "Users can delete their own provider assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'provider-assets');

-- Add comment for documentation
COMMENT ON POLICY "Authenticated users can upload provider assets" ON storage.objects 
IS 'Allows authenticated users to upload files to provider-assets bucket';

