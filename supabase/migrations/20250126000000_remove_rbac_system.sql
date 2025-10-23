-- ============================================================================
-- REMOVE RBAC (Role-Based Access Control) SYSTEM
-- ============================================================================
-- This migration removes the permission-based RBAC system and simplifies
-- authorization to use only provider membership checks.
--
-- What this migration does:
-- 1. Drops RLS policies on RBAC tables
-- 2. Drops the has_permission() function
-- 3. Drops RBAC tables (user_roles, role_permissions, provider_role_permissions)
-- 4. Drops app_permission enum
-- 5. Drops app_role and provider_role_type enums (these are replaced by provider_role)
-- 6. Updates custom_access_token_hook to remove role claims from JWT
-- 7. Updates handle_new_user trigger to not create user_roles
--
-- Note: The provider_role enum and provider_members table remain unchanged
-- as they are the foundation of the new simplified authorization system.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop RLS policies on RBAC tables
-- ============================================================================

-- Drop policies on role_permissions table
DROP POLICY IF EXISTS "role_permissions_select_policy" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin_update" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin_delete" ON public.role_permissions;

-- Drop policies on provider_role_permissions table
DROP POLICY IF EXISTS "provider_role_permissions_select_policy" ON public.provider_role_permissions;
DROP POLICY IF EXISTS "provider_role_permissions_admin_insert" ON public.provider_role_permissions;
DROP POLICY IF EXISTS "provider_role_permissions_admin_update" ON public.provider_permissions;
DROP POLICY IF EXISTS "provider_role_permissions_admin_delete" ON public.provider_role_permissions;

-- Drop policies on user_roles table
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
DROP POLICY IF EXISTS "auth_hook_can_read_user_roles" ON public.user_roles;

-- ============================================================================
-- STEP 2: Drop the has_permission() function
-- ============================================================================

DROP FUNCTION IF EXISTS public.has_permission(app_permission);
DROP FUNCTION IF EXISTS public.has_permission(permission_name app_permission);

-- ============================================================================
-- STEP 3: Revoke grants on RBAC tables
-- ============================================================================

REVOKE ALL ON TABLE public.user_roles FROM supabase_auth_admin;
REVOKE ALL ON TABLE public.role_permissions FROM supabase_auth_admin;
REVOKE ALL ON TABLE public.provider_role_permissions FROM supabase_auth_admin;

-- ============================================================================
-- STEP 4: Drop RBAC tables
-- ============================================================================

DROP TABLE IF EXISTS public.provider_role_permissions CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ============================================================================
-- STEP 5: Update custom_access_token_hook to remove role claims
-- ============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.custom_access_token_hook(event jsonb);

-- Recreate without role claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
BEGIN
  -- Get existing claims from the event
  claims := event->'claims';

  -- Note: We no longer add user_role or provider_role to JWT claims
  -- Authorization is now handled entirely through provider_members table
  -- and checked server-side via RLS policies

  -- Return the event with unmodified claims
  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Add comment
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Simplified access token hook. Authorization is now handled through provider_members table and RLS policies, not JWT claims.';

-- ============================================================================
-- STEP 6: Update handle_new_user trigger function
-- ============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate without user_roles insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avatar_url TEXT;
BEGIN
  -- Generate avatar URL from email
  avatar_url := 'https://api.dicebear.com/7.x/initials/svg?seed=' || 
                encode(NEW.email::bytea, 'base64');

  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.identities[0]->'identity_data'->>'full_name',
      NEW.identities[0]->'identity_data'->>'name'
    ),
    avatar_url,
    NOW()
  );

  -- Note: We no longer create a user_roles record
  -- Users will be assigned roles through provider_members when they join a provider

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS 
'Creates a profile for new users. Roles are now managed through provider_members table only.';

-- ============================================================================
-- STEP 7: Drop app_permission enum
-- ============================================================================

DROP TYPE IF EXISTS public.app_permission CASCADE;

-- ============================================================================
-- STEP 8: Drop app_role and provider_role_type enums
-- ============================================================================

-- Note: We keep provider_role enum as it's used by provider_members table
-- We only drop the old app_role and provider_role_type enums

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.provider_role_type CASCADE;

-- ============================================================================
-- STEP 9: Drop helper functions that reference RBAC
-- ============================================================================

DROP FUNCTION IF EXISTS public.has_role(required_role app_role);
DROP FUNCTION IF EXISTS public.has_provider_role(required_provider_role provider_role_type);
DROP FUNCTION IF EXISTS public.get_user_role();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify that RBAC tables are dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('user_roles', 'role_permissions', 'provider_role_permissions')
  ) THEN
    RAISE EXCEPTION 'RBAC tables still exist after migration';
  END IF;

  -- Verify that RBAC enums are dropped
  IF EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname IN ('app_role', 'provider_role_type', 'app_permission')
    AND typnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'RBAC enums still exist after migration';
  END IF;

  RAISE NOTICE 'RBAC system successfully removed';
END $$;

