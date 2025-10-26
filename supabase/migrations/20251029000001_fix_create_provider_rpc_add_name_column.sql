-- Fix create_provider_with_membership RPC to populate name column
-- Migration: 20251029000001_fix_create_provider_rpc_add_name_column.sql
-- Purpose: Update the RPC function to populate the name column with business_name
-- This fixes the "null value in column \"name\"" error during provider onboarding

BEGIN;

-- Drop the old function
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, BOOLEAN, INTEGER
);

-- Recreate the function with name column populated
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
  p_social_media_links JSONB DEFAULT '{}',
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
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_business_name IS NULL OR p_business_name = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  -- Check if provider already exists for this user
  IF EXISTS (SELECT 1 FROM public.providers WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Provider already exists for this user';
  END IF;

  -- Insert the provider record
  -- Note: name column is populated with business_name to satisfy NOT NULL constraint
  INSERT INTO public.providers (
    user_id,
    name,
    business_name,
    business_address,
    logo_url,
    description,
    service_areas,
    sample_menu_url,
    contact_person_name,
    mobile_number,
    social_media_links,
    onboarding_completed,
    onboarding_step
  ) VALUES (
    p_user_id,
    p_business_name,
    p_business_name,
    p_business_address,
    p_logo_url,
    p_description,
    p_service_areas,
    p_sample_menu_url,
    p_contact_person_name,
    p_mobile_number,
    p_social_media_links,
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
    'admin_created',
    NOW()
  );

  -- Return the provider ID
  RETURN v_provider_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, BOOLEAN, INTEGER
) TO authenticated;

COMMIT;

