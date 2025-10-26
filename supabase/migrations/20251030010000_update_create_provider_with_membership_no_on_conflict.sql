-- ============================================================================
-- UPDATE create_provider_with_membership: remove ON CONFLICT, use advisory lock
-- ============================================================================
-- Migration: 20251030010000_update_create_provider_with_membership_no_on_conflict.sql
-- Changes:
--   - Keep per-user advisory lock (pg_advisory_xact_lock)
--   - Remove all ON CONFLICT clauses
--   - Rely on existing unique constraints (e.g., providers.user_id)
--   - Keep idempotency logic if available (check/store)
--   - Return JSON: { provider_id, success, message }
-- ============================================================================

BEGIN;

-- Try to drop older variants to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, BOOLEAN, INTEGER
);

DROP FUNCTION IF EXISTS public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER
);

-- Recreate function with idempotency + simple inserts, no ON CONFLICT
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
  -- Serialize per user to prevent concurrent onboarding by the same user
  PERFORM pg_advisory_xact_lock(hashtext('onboard:' || p_user_id::text));

  -- Idempotency: return cached result if key already processed
  IF p_idempotency_key IS NOT NULL THEN
    BEGIN
      SELECT public.check_idempotency_key(p_idempotency_key, v_scope, p_user_id)
      INTO v_cached;
    EXCEPTION WHEN undefined_function OR undefined_table THEN
      -- If idempotency helpers aren't available, continue without them
      v_cached := NULL;
    END;

    IF v_cached IS NOT NULL THEN
      RETURN v_cached;
    END IF;
  END IF;

  -- Insert provider record (no ON CONFLICT). Unique constraint on providers.user_id
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
    social_media_links,
    onboarding_completed,
    onboarding_step,
    created_by,
    created_ip
  ) VALUES (
    p_user_id,
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
    p_client_ip
  ) RETURNING id INTO v_provider_id;

  -- Create owner membership for this provider (new provider -> no conflict expected)
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

  -- Build success result
  v_result := json_build_object(
    'provider_id', v_provider_id,
    'success', true,
    'message', 'Provider profile created successfully'
  );

  -- Store idempotency result (best-effort)
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
      -- Skip if helper not available
      NULL;
    END;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    -- Likely duplicate provider for this user. Fetch existing provider_id if any.
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

    -- Re-raise as unique_violation with a clear message so client mapping works
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

-- Ensure authenticated users can execute
GRANT EXECUTE ON FUNCTION public.create_provider_with_membership(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, BOOLEAN, INTEGER
) TO authenticated;

COMMIT;

