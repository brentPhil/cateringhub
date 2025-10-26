-- =========================================================================
-- SIMPLIFY create_provider_with_membership RPC
-- =========================================================================
-- Migration: 20251030050000_simplify_create_provider_with_membership_rpc.sql
-- Goal: Replace complex implementation (idempotency + advisory locks +
--       caching + multi-branch errors) with a straightforward, atomic
--       insert of provider + owner membership in a single transaction.
--       Rely on the DB unique constraint (providers.user_id) to prevent
--       duplicates. Return a simple JSON response on success.
-- =========================================================================

BEGIN;

-- Drop older variants to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, BOOLEAN, INTEGER
);

DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, BOOLEAN, INTEGER
);

DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER
);

-- Recreate simplified function (no idempotency, no advisory locks)
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
  -- Ensure the caller is creating for self
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION USING MESSAGE = 'Unauthorized: You can only create providers for yourself';
  END IF;

  -- Insert provider (unique constraint on providers.user_id enforces single provider per creator)
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
    NULLIF(p_client_ip, '')::INET
  ) RETURNING id INTO v_provider_id;

  -- Create owner membership (function is SECURITY DEFINER to bypass RLS)
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

  -- Return simple success payload
  RETURN json_build_object(
    'provider_id', v_provider_id,
    'success', true,
    'message', 'Provider profile created successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Surface a clear duplicate message for client mapping
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'User already has a provider profile';
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, BOOLEAN, INTEGER
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, BOOLEAN, INTEGER
) FROM public;

-- Comment
COMMENT ON FUNCTION public.create_provider_with_membership IS
'Simplified RPC: atomically creates provider + owner membership in one transaction. No idempotency or advisory locks. Relies on unique constraint on providers.user_id. Returns JSON {provider_id, success, message}.';

COMMIT;

