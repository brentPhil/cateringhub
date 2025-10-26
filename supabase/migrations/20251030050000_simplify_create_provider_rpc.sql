-- ============================================================================
-- SIMPLIFY create_provider_with_membership RPC
-- ============================================================================
-- Migration: 20251030050000_simplify_create_provider_rpc.sql
-- 
-- Purpose: Simplify the provider onboarding RPC by removing unnecessary complexity:
--   - Remove idempotency key checking and storage (handled client-side)
--   - Remove advisory locks (unique constraint is sufficient)
--   - Remove complex error result caching
--   - Simplify to basic transaction with clear error handling
--   - Rely on database unique constraint for duplicate prevention
--
-- The simplified version:
--   1. Creates provider record in providers table
--   2. Creates owner membership in provider_members table
--   3. Uses simple transaction (implicit in function)
--   4. Returns clear success/error response
--   5. Lets unique constraint on providers.user_id prevent duplicates
-- ============================================================================

BEGIN;

-- Drop existing function variants
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, BOOLEAN, INTEGER
);

DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, INET, BOOLEAN, INTEGER
);

-- Create simplified function
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
  p_social_links JSONB DEFAULT '{}'::jsonb,
  p_client_ip TEXT DEFAULT NULL,
  p_onboarding_completed BOOLEAN DEFAULT true,
  p_onboarding_step INTEGER DEFAULT 3
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Insert provider record
  -- The unique constraint on providers.user_id will prevent duplicates
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
    onboarding_step,
    created_by,
    created_ip
  ) VALUES (
    p_user_id,
    p_business_name,
    p_business_name,
    p_business_address,
    p_logo_url,
    p_description,
    COALESCE(p_service_areas, '{}'),
    p_sample_menu_url,
    p_contact_person_name,
    p_mobile_number,
    COALESCE(p_social_links, '{}'::jsonb),
    COALESCE(p_onboarding_completed, true),
    COALESCE(p_onboarding_step, 3),
    p_user_id,
    CASE 
      WHEN p_client_ip IS NOT NULL THEN p_client_ip::INET 
      ELSE NULL 
    END
  ) RETURNING id INTO v_provider_id;

  -- Create owner membership
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

  -- Return success
  RETURN json_build_object(
    'provider_id', v_provider_id,
    'success', true,
    'message', 'Provider profile created successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- User already has a provider profile
    -- Re-raise with clear message for client error handling
    RAISE EXCEPTION 'User already has a provider profile'
      USING ERRCODE = '23505';
      
  WHEN OTHERS THEN
    -- Re-raise any other errors with original details
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, BOOLEAN, INTEGER
) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.create_provider_with_membership IS 
'Simplified provider onboarding function that atomically creates a provider record and owner membership.
Uses database unique constraint on providers.user_id to prevent duplicates.
Returns JSON with provider_id, success flag, and message.
Raises unique_violation (23505) if user already has a provider profile.';

COMMIT;

