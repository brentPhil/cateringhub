-- ============================================================================
-- FIX RPC FUNCTION: Remove social_media_links parameter
-- ============================================================================
-- Migration: 20251027000001_fix_create_provider_rpc.sql
-- Purpose: Fix the create_provider_with_membership RPC function to remove
--          the social_media_links parameter since the providers table doesn't
--          have this column. Social links are stored in provider_social_links table.
-- ============================================================================

BEGIN;

-- Drop the old function
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, BOOLEAN, INTEGER
);

-- Recreate the function without social_media_links parameter
CREATE OR REPLACE FUNCTION public.create_provider_with_membership(
  p_user_id UUID,
  p_business_name TEXT,
  p_description TEXT,
  p_contact_person_name TEXT,
  p_mobile_number TEXT,
  p_business_address TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_service_areas TEXT[] DEFAULT '{}',
  p_sample_menu_url TEXT DEFAULT NULL,
  p_onboarding_completed BOOLEAN DEFAULT true,
  p_onboarding_step INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Validate that the calling user matches p_user_id
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only create providers for yourself';
  END IF;

  -- Check if user already has a provider (one provider per user as creator)
  IF EXISTS (
    SELECT 1 FROM public.providers 
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User already has a provider profile';
  END IF;

  -- Insert the provider record (without social_media_links)
  INSERT INTO public.providers (
    user_id,
    business_name,
    business_address,
    logo_url,
    description,
    service_areas,
    sample_menu_url,
    contact_person_name,
    mobile_number,
    onboarding_completed,
    onboarding_step
  ) VALUES (
    p_user_id,
    p_business_name,
    p_business_address,
    p_logo_url,
    p_description,
    p_service_areas,
    p_sample_menu_url,
    p_contact_person_name,
    p_mobile_number,
    p_onboarding_completed,
    p_onboarding_step
  )
  RETURNING id INTO v_provider_id;

  -- Create the owner membership record
  -- This bypasses RLS because the function is SECURITY DEFINER
  INSERT INTO public.provider_members (
    provider_id,
    user_id,
    role,
    status,
    invitation_method,
    joined_at
  ) VALUES (
    v_provider_id,
    p_user_id,
    'owner',
    'active',
    'onboarding',
    NOW()
  );

  -- Return the provider ID
  RETURN v_provider_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER
) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER
) FROM public;

-- Update comment
COMMENT ON FUNCTION public.create_provider_with_membership IS
'Atomically creates a provider record and adds the creating user as owner in provider_members. 
This ensures dashboard access works immediately after onboarding. 
Uses SECURITY DEFINER to bypass RLS for membership creation.
Note: Social media links should be added separately via provider_social_links table.';

RAISE NOTICE '============================================================================';
RAISE NOTICE 'RPC FUNCTION FIXED SUCCESSFULLY!';
RAISE NOTICE '============================================================================';
RAISE NOTICE 'Removed social_media_links parameter from create_provider_with_membership';
RAISE NOTICE 'Social links should be added separately to provider_social_links table';
RAISE NOTICE '============================================================================';

COMMIT;

