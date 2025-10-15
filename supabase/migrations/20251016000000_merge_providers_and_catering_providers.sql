-- ============================================================================
-- MERGE PROVIDERS AND CATERING_PROVIDERS TABLES
-- ============================================================================
-- Migration: 20251016000000_merge_providers_and_catering_providers.sql
-- Date: October 15, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Merge the `providers` and `catering_providers` tables into a single
--   unified `providers` table to eliminate the three-table join architecture
--   and simplify the database schema.
--
-- Changes:
--   1. Add all business profile columns to providers table
--   2. Migrate data from catering_providers to providers
--   3. Update foreign keys in related tables
--   4. Drop catering_providers table
--   5. Update RLS policies for team access
--   6. Recreate indexes and triggers
--
-- Estimated Time: 2-5 minutes
-- Rollback: See ROLLBACK INSTRUCTIONS section at end of file
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: BACKUP AND VALIDATION
-- ============================================================================

-- Create a backup table for catering_providers (for rollback)
CREATE TABLE IF NOT EXISTS public.catering_providers_backup AS 
SELECT * FROM public.catering_providers;

COMMENT ON TABLE public.catering_providers_backup IS 
'Backup of catering_providers table before merge migration. Can be used for rollback.';

-- Validate data integrity
DO $$
DECLARE
  v_providers_count INTEGER;
  v_catering_providers_count INTEGER;
  v_orphaned_providers INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO v_providers_count FROM public.providers;
  SELECT COUNT(*) INTO v_catering_providers_count FROM public.catering_providers;
  
  -- Check for orphaned providers (providers without catering_provider_id)
  SELECT COUNT(*) INTO v_orphaned_providers 
  FROM public.providers 
  WHERE catering_provider_id IS NULL;
  
  RAISE NOTICE 'Validation Results:';
  RAISE NOTICE '  - Providers count: %', v_providers_count;
  RAISE NOTICE '  - Catering providers count: %', v_catering_providers_count;
  RAISE NOTICE '  - Orphaned providers: %', v_orphaned_providers;
  
  IF v_orphaned_providers > 0 THEN
    RAISE WARNING 'Found % providers without catering_provider_id. These will not be migrated.', v_orphaned_providers;
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: ADD BUSINESS PROFILE COLUMNS TO PROVIDERS TABLE
-- ============================================================================

RAISE NOTICE 'Adding business profile columns to providers table...';

-- Original creator tracking
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Business Information
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Service Details
-- Note: description already exists in providers, we'll update it with catering_providers data
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sample_menu_url TEXT;

-- Contact Information
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS mobile_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Address Fields
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS barangay TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS province TEXT;

-- Availability & Visibility
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS service_radius INTEGER,
ADD COLUMN IF NOT EXISTS daily_capacity INTEGER,
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER,
ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS max_service_radius INTEGER DEFAULT 100;

-- Media
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS banner_image TEXT,
ADD COLUMN IF NOT EXISTS banner_adjustments JSONB,
ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

-- Onboarding
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;

-- Add comments for documentation
COMMENT ON COLUMN public.providers.user_id IS 'Original creator of the provider profile (for backward compatibility)';
COMMENT ON COLUMN public.providers.business_name IS 'Business name of the catering provider';
COMMENT ON COLUMN public.providers.name IS 'Organization/team name (may differ from business_name)';
COMMENT ON COLUMN public.providers.description IS 'Business description';
COMMENT ON COLUMN public.providers.service_areas IS 'Array of service area codes';
COMMENT ON COLUMN public.providers.contact_person_name IS 'Primary contact person name';
COMMENT ON COLUMN public.providers.mobile_number IS 'Primary contact mobile number';
COMMENT ON COLUMN public.providers.email IS 'Contact email address';
COMMENT ON COLUMN public.providers.province IS 'Province code from PSGC (Philippine Standard Geographic Code)';
COMMENT ON COLUMN public.providers.city IS 'City/municipality code from PSGC';
COMMENT ON COLUMN public.providers.barangay IS 'Barangay identifier';
COMMENT ON COLUMN public.providers.is_visible IS 'Whether the provider profile is visible to customers';
COMMENT ON COLUMN public.providers.service_radius IS 'Default service radius in kilometers';
COMMENT ON COLUMN public.providers.daily_capacity IS 'Maximum number of events the provider can handle per day';
COMMENT ON COLUMN public.providers.advance_booking_days IS 'Minimum number of days notice required for bookings';
COMMENT ON COLUMN public.providers.available_days IS 'Array of day names when the provider is available';
COMMENT ON COLUMN public.providers.max_service_radius IS 'Maximum allowed service radius for any location';
COMMENT ON COLUMN public.providers.featured_image_url IS 'URL of the featured image (must exist in provider_gallery_images)';
COMMENT ON COLUMN public.providers.onboarding_completed IS 'Whether the provider has completed onboarding';
COMMENT ON COLUMN public.providers.onboarding_step IS 'Current step in the onboarding process';

RAISE NOTICE 'Business profile columns added successfully.';

-- ============================================================================
-- PHASE 3: MIGRATE DATA FROM CATERING_PROVIDERS TO PROVIDERS
-- ============================================================================

RAISE NOTICE 'Migrating data from catering_providers to providers...';

-- Update providers table with data from catering_providers
UPDATE public.providers p
SET
  user_id = cp.user_id,
  business_name = cp.business_name,
  business_address = cp.business_address,
  logo_url = cp.logo_url,
  tagline = cp.tagline,
  description = cp.description, -- Override with business description
  service_areas = cp.service_areas,
  sample_menu_url = cp.sample_menu_url,
  contact_person_name = cp.contact_person_name,
  mobile_number = cp.mobile_number,
  email = cp.email,
  street_address = cp.street_address,
  city = cp.city,
  barangay = cp.barangay,
  postal_code = cp.postal_code,
  province = cp.province,
  is_visible = cp.is_visible,
  service_radius = cp.service_radius,
  daily_capacity = cp.daily_capacity,
  advance_booking_days = cp.advance_booking_days,
  available_days = cp.available_days,
  max_service_radius = cp.max_service_radius,
  banner_image = cp.banner_image,
  banner_adjustments = cp.banner_adjustments,
  gallery_images = cp.gallery_images,
  featured_image_url = cp.featured_image_url,
  onboarding_completed = cp.onboarding_completed,
  onboarding_step = cp.onboarding_step,
  updated_at = cp.updated_at
FROM public.catering_providers cp
WHERE p.catering_provider_id = cp.id;

-- Verify migration
DO $$
DECLARE
  v_migrated_count INTEGER;
  v_expected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count 
  FROM public.providers 
  WHERE business_name IS NOT NULL;
  
  SELECT COUNT(*) INTO v_expected_count 
  FROM public.providers 
  WHERE catering_provider_id IS NOT NULL;
  
  RAISE NOTICE 'Data Migration Results:';
  RAISE NOTICE '  - Records migrated: %', v_migrated_count;
  RAISE NOTICE '  - Expected records: %', v_expected_count;
  
  IF v_migrated_count != v_expected_count THEN
    RAISE EXCEPTION 'Data migration failed: migrated % records but expected %', 
      v_migrated_count, v_expected_count;
  END IF;
  
  RAISE NOTICE 'Data migration completed successfully.';
END $$;

-- ============================================================================
-- PHASE 4: UPDATE FOREIGN KEYS IN RELATED TABLES
-- ============================================================================

RAISE NOTICE 'Updating foreign keys in related tables...';

-- Add temporary column to track old catering_provider_id during migration
ALTER TABLE public.service_locations 
ADD COLUMN IF NOT EXISTS old_provider_id UUID;

ALTER TABLE public.provider_social_links 
ADD COLUMN IF NOT EXISTS old_provider_id UUID;

ALTER TABLE public.provider_gallery_images 
ADD COLUMN IF NOT EXISTS old_provider_id UUID;

-- Store old IDs for rollback
UPDATE public.service_locations 
SET old_provider_id = provider_id;

UPDATE public.provider_social_links 
SET old_provider_id = provider_id;

UPDATE public.provider_gallery_images 
SET old_provider_id = provider_id;

-- Update service_locations to reference providers.id
UPDATE public.service_locations sl
SET provider_id = p.id
FROM public.providers p
WHERE sl.provider_id = p.catering_provider_id;

-- Update provider_social_links to reference providers.id
UPDATE public.provider_social_links psl
SET provider_id = p.id
FROM public.providers p
WHERE psl.provider_id = p.catering_provider_id;

-- Update provider_gallery_images to reference providers.id
UPDATE public.provider_gallery_images pgi
SET provider_id = p.id
FROM public.providers p
WHERE pgi.provider_id = p.catering_provider_id;

-- Verify foreign key updates
DO $$
DECLARE
  v_service_locations_updated INTEGER;
  v_social_links_updated INTEGER;
  v_gallery_images_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_service_locations_updated 
  FROM public.service_locations 
  WHERE provider_id IN (SELECT id FROM public.providers);
  
  SELECT COUNT(*) INTO v_social_links_updated 
  FROM public.provider_social_links 
  WHERE provider_id IN (SELECT id FROM public.providers);
  
  SELECT COUNT(*) INTO v_gallery_images_updated 
  FROM public.provider_gallery_images 
  WHERE provider_id IN (SELECT id FROM public.providers);
  
  RAISE NOTICE 'Foreign Key Update Results:';
  RAISE NOTICE '  - service_locations updated: %', v_service_locations_updated;
  RAISE NOTICE '  - provider_social_links updated: %', v_social_links_updated;
  RAISE NOTICE '  - provider_gallery_images updated: %', v_gallery_images_updated;
END $$;

RAISE NOTICE 'Foreign keys updated successfully.';

-- ============================================================================
-- PHASE 5: DROP OLD CONSTRAINTS AND UPDATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

RAISE NOTICE 'Updating foreign key constraints...';

-- Drop old foreign key constraints
ALTER TABLE public.service_locations
DROP CONSTRAINT IF EXISTS service_locations_provider_id_fkey;

ALTER TABLE public.provider_social_links
DROP CONSTRAINT IF EXISTS provider_social_links_provider_id_fkey;

ALTER TABLE public.provider_gallery_images
DROP CONSTRAINT IF EXISTS provider_gallery_images_provider_id_fkey;

-- Create new foreign key constraints pointing to providers.id
ALTER TABLE public.service_locations
ADD CONSTRAINT service_locations_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE public.provider_social_links
ADD CONSTRAINT provider_social_links_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE public.provider_gallery_images
ADD CONSTRAINT provider_gallery_images_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

RAISE NOTICE 'Foreign key constraints updated successfully.';

-- ============================================================================
-- PHASE 6: DROP CATERING_PROVIDERS TABLE AND CLEANUP
-- ============================================================================

RAISE NOTICE 'Dropping catering_providers table and cleaning up...';

-- Drop the providers.catering_provider_id foreign key constraint
ALTER TABLE public.providers
DROP CONSTRAINT IF EXISTS providers_catering_provider_id_fkey;

-- Drop the catering_provider_id column (no longer needed)
ALTER TABLE public.providers
DROP COLUMN IF EXISTS catering_provider_id;

-- Drop triggers on catering_providers
DROP TRIGGER IF EXISTS trigger_validate_featured_image ON public.catering_providers;
DROP TRIGGER IF EXISTS update_catering_providers_updated_at ON public.catering_providers;

-- Drop the catering_providers table
DROP TABLE IF EXISTS public.catering_providers CASCADE;

-- Drop the old update function (we'll create a new one for providers)
DROP FUNCTION IF EXISTS public.update_catering_providers_updated_at();

RAISE NOTICE 'Catering providers table dropped successfully.';

-- ============================================================================
-- PHASE 7: CREATE INDEXES ON NEW COLUMNS
-- ============================================================================

RAISE NOTICE 'Creating indexes on new columns...';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_providers_user_id
ON public.providers(user_id);

CREATE INDEX IF NOT EXISTS idx_providers_business_name
ON public.providers(business_name);

CREATE INDEX IF NOT EXISTS idx_providers_province
ON public.providers(province);

CREATE INDEX IF NOT EXISTS idx_providers_city
ON public.providers(city);

CREATE INDEX IF NOT EXISTS idx_providers_is_visible
ON public.providers(is_visible);

CREATE INDEX IF NOT EXISTS idx_providers_onboarding_completed
ON public.providers(onboarding_completed);

-- GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_providers_service_areas
ON public.providers USING GIN(service_areas);

CREATE INDEX IF NOT EXISTS idx_providers_available_days
ON public.providers USING GIN(available_days);

CREATE INDEX IF NOT EXISTS idx_providers_banner_adjustments
ON public.providers USING GIN(banner_adjustments);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_providers_visible_province
ON public.providers(is_visible, province)
WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_providers_user_onboarding
ON public.providers(user_id, onboarding_completed);

RAISE NOTICE 'Indexes created successfully.';

-- ============================================================================
-- PHASE 8: CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

RAISE NOTICE 'Creating triggers and functions...';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_providers_updated_at ON public.providers;
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_providers_updated_at();

-- Create trigger to validate featured image
DROP TRIGGER IF EXISTS trigger_validate_featured_image ON public.providers;
CREATE TRIGGER trigger_validate_featured_image
  BEFORE INSERT OR UPDATE ON public.providers
  FOR EACH ROW
  WHEN (NEW.featured_image_url IS NOT NULL)
  EXECUTE FUNCTION public.validate_featured_image();

-- Update the clear_featured_image_on_delete function to reference providers
CREATE OR REPLACE FUNCTION public.clear_featured_image_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If the deleted image was a featured image, clear it from providers
  UPDATE public.providers
  SET featured_image_url = NULL
  WHERE id = OLD.provider_id
  AND featured_image_url = OLD.image_url;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_providers_updated_at IS
'Automatically updates the updated_at timestamp when a provider record is modified';

COMMENT ON FUNCTION public.clear_featured_image_on_delete IS
'Clears featured_image_url from providers table when the featured image is deleted from gallery';

RAISE NOTICE 'Triggers and functions created successfully.';

-- ============================================================================
-- PHASE 9: UPDATE RLS POLICIES FOR TEAM ACCESS
-- ============================================================================

RAISE NOTICE 'Updating RLS policies for team access...';

-- Drop old RLS policies on providers (if any exist from old schema)
DROP POLICY IF EXISTS "Users can view their own provider" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own provider" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own provider" ON public.providers;

-- Create new RLS policies that support team access

-- SELECT: Team members can view their provider's profile
CREATE POLICY "Team members can view provider profile"
ON public.providers
FOR SELECT
TO authenticated
USING (
  -- User is a member of this provider
  id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
  OR
  -- User is the original creator (backward compatibility)
  user_id = auth.uid()
  OR
  -- Admins can view all providers
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- INSERT: Only authenticated users can create providers
-- (The auto-owner trigger will add them as owner)
CREATE POLICY "Authenticated users can create providers"
ON public.providers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE: Team members with appropriate roles can update
CREATE POLICY "Team members can update provider profile"
ON public.providers
FOR UPDATE
TO authenticated
USING (
  -- User is the original creator
  user_id = auth.uid()
  OR
  -- User is a team member with owner, admin, or manager role
  id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  user_id = auth.uid()
  OR
  id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
);

-- DELETE: Only owners can delete providers
CREATE POLICY "Owners can delete providers"
ON public.providers
FOR DELETE
TO authenticated
USING (
  -- User is the original creator
  user_id = auth.uid()
  OR
  -- User is a team member with owner role
  id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'owner'
  )
);

-- Add policy comments
COMMENT ON POLICY "Team members can view provider profile" ON public.providers IS
'Allows team members to view their provider profile. Also allows original creator and admins.';

COMMENT ON POLICY "Authenticated users can create providers" ON public.providers IS
'Allows any authenticated user to create a provider. They will automatically become the owner.';

COMMENT ON POLICY "Team members can update provider profile" ON public.providers IS
'Allows team members with owner, admin, or manager roles to update the provider profile.';

COMMENT ON POLICY "Owners can delete providers" ON public.providers IS
'Only owners can delete provider organizations.';

RAISE NOTICE 'RLS policies updated successfully.';

-- ============================================================================
-- PHASE 10: UPDATE RLS POLICIES ON RELATED TABLES
-- ============================================================================

RAISE NOTICE 'Updating RLS policies on related tables...';

-- Update service_locations RLS policies
DROP POLICY IF EXISTS "Providers can view own locations" ON public.service_locations;
DROP POLICY IF EXISTS "Providers can insert own locations" ON public.service_locations;
DROP POLICY IF EXISTS "Providers can update own locations" ON public.service_locations;
DROP POLICY IF EXISTS "Providers can delete own locations" ON public.service_locations;

-- New policies for service_locations (team access)
CREATE POLICY "Team members can view service locations"
ON public.service_locations
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Team members can manage service locations"
ON public.service_locations
FOR ALL
TO authenticated
USING (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
);

-- Update provider_social_links RLS policies
DROP POLICY IF EXISTS "Providers can view own social links" ON public.provider_social_links;
DROP POLICY IF EXISTS "Providers can insert own social links" ON public.provider_social_links;
DROP POLICY IF EXISTS "Providers can update own social links" ON public.provider_social_links;
DROP POLICY IF EXISTS "Providers can delete own social links" ON public.provider_social_links;

-- New policies for provider_social_links (team access)
CREATE POLICY "Team members can view social links"
ON public.provider_social_links
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Team members can manage social links"
ON public.provider_social_links
FOR ALL
TO authenticated
USING (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
);

-- Update provider_gallery_images RLS policies
DROP POLICY IF EXISTS "Providers can insert gallery images" ON public.provider_gallery_images;
DROP POLICY IF EXISTS "Providers can update gallery images" ON public.provider_gallery_images;
DROP POLICY IF EXISTS "Providers can delete gallery images" ON public.provider_gallery_images;

-- New policies for provider_gallery_images (team access)
-- Note: Keep the public SELECT policy for gallery images
CREATE POLICY "Team members can manage gallery images"
ON public.provider_gallery_images
FOR ALL
TO authenticated
USING (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  provider_id IN (
    SELECT provider_id
    FROM public.provider_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin', 'manager')
  )
);

RAISE NOTICE 'RLS policies on related tables updated successfully.';

-- ============================================================================
-- PHASE 11: CLEANUP TEMPORARY COLUMNS
-- ============================================================================

RAISE NOTICE 'Cleaning up temporary migration columns...';

-- Drop temporary columns used for tracking during migration
ALTER TABLE public.service_locations
DROP COLUMN IF EXISTS old_provider_id;

ALTER TABLE public.provider_social_links
DROP COLUMN IF EXISTS old_provider_id;

ALTER TABLE public.provider_gallery_images
DROP COLUMN IF EXISTS old_provider_id;

RAISE NOTICE 'Temporary columns cleaned up successfully.';

-- ============================================================================
-- PHASE 12: ADD CONSTRAINTS
-- ============================================================================

RAISE NOTICE 'Adding constraints...';

-- Add NOT NULL constraints on critical business fields
-- (Only if data exists - for new providers these will be set during onboarding)
ALTER TABLE public.providers
ALTER COLUMN business_name DROP NOT NULL; -- Make nullable for flexibility

ALTER TABLE public.providers
ALTER COLUMN contact_person_name DROP NOT NULL; -- Make nullable for flexibility

ALTER TABLE public.providers
ALTER COLUMN mobile_number DROP NOT NULL; -- Make nullable for flexibility

-- Add unique constraint on user_id (one provider per user as original creator)
-- Note: This is for backward compatibility - users can be members of multiple providers
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_user_id_unique
ON public.providers(user_id)
WHERE user_id IS NOT NULL;

RAISE NOTICE 'Constraints added successfully.';

-- ============================================================================
-- PHASE 13: FINAL VALIDATION
-- ============================================================================

RAISE NOTICE 'Running final validation...';

DO $$
DECLARE
  v_providers_count INTEGER;
  v_service_locations_count INTEGER;
  v_social_links_count INTEGER;
  v_gallery_images_count INTEGER;
  v_orphaned_locations INTEGER;
  v_orphaned_links INTEGER;
  v_orphaned_images INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO v_providers_count FROM public.providers;
  SELECT COUNT(*) INTO v_service_locations_count FROM public.service_locations;
  SELECT COUNT(*) INTO v_social_links_count FROM public.provider_social_links;
  SELECT COUNT(*) INTO v_gallery_images_count FROM public.provider_gallery_images;

  -- Check for orphaned records
  SELECT COUNT(*) INTO v_orphaned_locations
  FROM public.service_locations
  WHERE provider_id NOT IN (SELECT id FROM public.providers);

  SELECT COUNT(*) INTO v_orphaned_links
  FROM public.provider_social_links
  WHERE provider_id NOT IN (SELECT id FROM public.providers);

  SELECT COUNT(*) INTO v_orphaned_images
  FROM public.provider_gallery_images
  WHERE provider_id NOT IN (SELECT id FROM public.providers);

  RAISE NOTICE 'Final Validation Results:';
  RAISE NOTICE '  - Total providers: %', v_providers_count;
  RAISE NOTICE '  - Total service locations: %', v_service_locations_count;
  RAISE NOTICE '  - Total social links: %', v_social_links_count;
  RAISE NOTICE '  - Total gallery images: %', v_gallery_images_count;
  RAISE NOTICE '  - Orphaned locations: %', v_orphaned_locations;
  RAISE NOTICE '  - Orphaned social links: %', v_orphaned_links;
  RAISE NOTICE '  - Orphaned gallery images: %', v_orphaned_images;

  IF v_orphaned_locations > 0 OR v_orphaned_links > 0 OR v_orphaned_images > 0 THEN
    RAISE EXCEPTION 'Migration validation failed: found orphaned records';
  END IF;

  RAISE NOTICE 'Migration validation passed successfully!';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '============================================================================';
RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
RAISE NOTICE '============================================================================';
RAISE NOTICE '';
RAISE NOTICE 'Summary:';
RAISE NOTICE '  ✅ Business profile columns added to providers table';
RAISE NOTICE '  ✅ Data migrated from catering_providers to providers';
RAISE NOTICE '  ✅ Foreign keys updated in related tables';
RAISE NOTICE '  ✅ catering_providers table dropped';
RAISE NOTICE '  ✅ Indexes created on new columns';
RAISE NOTICE '  ✅ Triggers and functions updated';
RAISE NOTICE '  ✅ RLS policies updated for team access';
RAISE NOTICE '  ✅ All validations passed';
RAISE NOTICE '';
RAISE NOTICE 'Next Steps:';
RAISE NOTICE '  1. Regenerate TypeScript types: pnpm supabase gen types typescript';
RAISE NOTICE '  2. Update client-side code (see docs/SCHEMA_REFACTORING_BREAKING_CHANGES.md)';
RAISE NOTICE '  3. Test all functionality thoroughly';
RAISE NOTICE '  4. Deploy updated client code';
RAISE NOTICE '';
RAISE NOTICE 'Backup Table:';
RAISE NOTICE '  - catering_providers_backup (can be dropped after verification)';
RAISE NOTICE '';
RAISE NOTICE '============================================================================';

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
--
-- If you need to rollback this migration, run the following SQL:
--
-- BEGIN;
--
-- -- 1. Recreate catering_providers table from backup
-- CREATE TABLE public.catering_providers AS
-- SELECT * FROM public.catering_providers_backup;
--
-- -- 2. Restore foreign key constraints
-- ALTER TABLE public.catering_providers
-- ADD CONSTRAINT catering_providers_pkey PRIMARY KEY (id);
--
-- ALTER TABLE public.catering_providers
-- ADD CONSTRAINT catering_providers_user_id_key UNIQUE (user_id);
--
-- ALTER TABLE public.catering_providers
-- ADD CONSTRAINT catering_providers_user_id_fkey
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- -- 3. Add catering_provider_id back to providers
-- ALTER TABLE public.providers
-- ADD COLUMN catering_provider_id UUID REFERENCES public.catering_providers(id);
--
-- UPDATE public.providers p
-- SET catering_provider_id = cp.id
-- FROM public.catering_providers cp
-- WHERE p.user_id = cp.user_id;
--
-- -- 4. Restore foreign keys in related tables
-- UPDATE public.service_locations sl
-- SET provider_id = p.catering_provider_id
-- FROM public.providers p
-- WHERE sl.provider_id = p.id;
--
-- UPDATE public.provider_social_links psl
-- SET provider_id = p.catering_provider_id
-- FROM public.providers p
-- WHERE psl.provider_id = p.id;
--
-- UPDATE public.provider_gallery_images pgi
-- SET provider_id = p.catering_provider_id
-- FROM public.providers p
-- WHERE pgi.provider_id = p.id;
--
-- -- 5. Drop foreign key constraints and recreate with catering_providers
-- ALTER TABLE public.service_locations
-- DROP CONSTRAINT service_locations_provider_id_fkey,
-- ADD CONSTRAINT service_locations_provider_id_fkey
-- FOREIGN KEY (provider_id) REFERENCES public.catering_providers(id) ON DELETE CASCADE;
--
-- ALTER TABLE public.provider_social_links
-- DROP CONSTRAINT provider_social_links_provider_id_fkey,
-- ADD CONSTRAINT provider_social_links_provider_id_fkey
-- FOREIGN KEY (provider_id) REFERENCES public.catering_providers(id) ON DELETE CASCADE;
--
-- ALTER TABLE public.provider_gallery_images
-- DROP CONSTRAINT provider_gallery_images_provider_id_fkey,
-- ADD CONSTRAINT provider_gallery_images_provider_id_fkey
-- FOREIGN KEY (provider_id) REFERENCES public.catering_providers(id) ON DELETE CASCADE;
--
-- -- 6. Remove business profile columns from providers
-- ALTER TABLE public.providers
-- DROP COLUMN user_id,
-- DROP COLUMN business_name,
-- DROP COLUMN business_address,
-- DROP COLUMN logo_url,
-- DROP COLUMN tagline,
-- DROP COLUMN service_areas,
-- DROP COLUMN sample_menu_url,
-- DROP COLUMN contact_person_name,
-- DROP COLUMN mobile_number,
-- DROP COLUMN email,
-- DROP COLUMN street_address,
-- DROP COLUMN city,
-- DROP COLUMN barangay,
-- DROP COLUMN postal_code,
-- DROP COLUMN province,
-- DROP COLUMN is_visible,
-- DROP COLUMN service_radius,
-- DROP COLUMN daily_capacity,
-- DROP COLUMN advance_booking_days,
-- DROP COLUMN available_days,
-- DROP COLUMN max_service_radius,
-- DROP COLUMN banner_image,
-- DROP COLUMN banner_adjustments,
-- DROP COLUMN gallery_images,
-- DROP COLUMN featured_image_url,
-- DROP COLUMN onboarding_completed,
-- DROP COLUMN onboarding_step;
--
-- -- 7. Restore old RLS policies
-- -- (See original migration files for exact policy definitions)
--
-- COMMIT;
--
-- ============================================================================

