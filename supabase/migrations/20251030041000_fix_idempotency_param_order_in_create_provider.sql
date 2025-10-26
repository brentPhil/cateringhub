-- ============================================================================
-- FIX idempotency param order in create_provider_with_membership
-- ============================================================================
-- Migration: 20251030041000_fix_idempotency_param_order_in_create_provider.sql
-- Purpose: Ensure idempotency works by calling check_idempotency_key with named args
-- Notes:
--  - Previous version called check_idempotency_key(p_key, v_scope, p_user_id)
--    but the function signature is (p_key text, p_user_id uuid, p_scope text)
--  - This caused idempotency lookups to fail, allowing duplicate submissions to
--    proceed and later hit UNIQUE constraints on retry/concurrency
-- ============================================================================

BEGIN;

-- Drop the function to replace it with corrected implementation
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, BOOLEAN, INTEGER
);

-- Recreate with corrected idempotency call
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
  p_idempotency_key TEXT DEFAULT NULL,
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
  v_result JSON;
  v_cached JSON;
  v_scope TEXT := 'create_provider_with_membership';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('onboard:' || p_user_id::text));

  -- Idempotency: use named parameters to avoid arg-order bugs
  IF p_idempotency_key IS NOT NULL THEN
    BEGIN
      SELECT public.check_idempotency_key(
        p_key => p_idempotency_key,
        p_user_id => p_user_id,
        p_scope => v_scope
      ) INTO v_cached;
    EXCEPTION WHEN undefined_function OR undefined_table THEN
      v_cached := NULL;
    END;

    IF v_cached IS NOT NULL THEN
      RETURN v_cached;
    END IF;
  END IF;

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
    p_client_ip::INET
  ) RETURNING id INTO v_provider_id;

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

  v_result := json_build_object(
    'provider_id', v_provider_id,
    'success', true,
    'message', 'Provider profile created successfully'
  );

  IF p_idempotency_key IS NOT NULL THEN
    BEGIN
      PERFORM public.store_idempotency_result(
        p_key => p_idempotency_key,
        p_scope => v_scope,
        p_user_id => p_user_id,
        p_result => v_result,
        p_status => 'success',
        p_error_details => NULL
      );
    EXCEPTION WHEN undefined_function OR undefined_table THEN
      NULL;
    END;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_provider_id FROM public.providers WHERE user_id = p_user_id LIMIT 1;

    v_result := json_build_object(
      'provider_id', v_provider_id,
      'success', false,
      'message', 'User already has a provider profile'
    );

    IF p_idempotency_key IS NOT NULL THEN
      BEGIN
        PERFORM public.store_idempotency_result(
          p_key => p_idempotency_key,
          p_scope => v_scope,
          p_user_id => p_user_id,
          p_result => v_result,
          p_status => 'error',
          p_error_details => json_build_object('code', SQLSTATE, 'message', SQLERRM)
        );
      EXCEPTION WHEN undefined_function OR undefined_table THEN
        NULL;
      END;
    END IF;

    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'User already has a provider profile';

  WHEN OTHERS THEN
    IF p_idempotency_key IS NOT NULL THEN
      BEGIN
        PERFORM public.store_idempotency_result(
          p_key => p_idempotency_key,
          p_scope => v_scope,
          p_user_id => p_user_id,
          p_result => json_build_object('success', false),
          p_status => 'error',
          p_error_details => json_build_object('code', SQLSTATE, 'message', SQLERRM)
        );
      EXCEPTION WHEN undefined_function OR undefined_table THEN
        NULL;
      END;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, BOOLEAN, INTEGER
) TO authenticated;

COMMIT;

