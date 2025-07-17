# RLS Policies Analysis - Permission to Role-Based Migration

## Current RLS Policies Using has_permission()

### 1. Profiles Table Policies

#### Current Permission-Based Policies:

```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_permission('users.read'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_permission('users.write'));
```

#### Proposed Role-Based Replacements:

```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role('admin'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role('admin'));
```

**Rationale:** Only admins had `users.read` and `users.write` permissions, so direct admin role check is equivalent.

### 2. User Roles Table Policies

#### Current Permission-Based Policies:

```sql
-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (has_permission('users.read'));

-- Allow admins to manage user roles
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (has_permission('users.write'));
```

#### Proposed Role-Based Replacements:

```sql
-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (has_role('admin'));

-- Allow admins to manage user roles
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (has_role('admin'));
```

**Rationale:** Only admins had `users.read` and `users.write` permissions.

### 3. Role Permissions Table Policies (TO BE REMOVED)

#### Current Permission-Based Policies:

```sql
-- Allow admins to manage role permissions
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (has_permission('settings.write'));
```

**Action:** This entire table and its policies will be dropped during migration.

### 4. Provider Role Permissions Table Policies (TO BE REMOVED)

#### Current Permission-Based Policies:

```sql
-- Allow admins to manage provider role permissions
CREATE POLICY "provider_role_permissions_admin_insert_policy"
  ON public.provider_role_permissions FOR INSERT
  WITH CHECK ((select has_permission('settings.write'::app_permission)));

CREATE POLICY "provider_role_permissions_admin_update_policy"
  ON public.provider_role_permissions FOR UPDATE
  USING ((select has_permission('settings.write'::app_permission)))
  WITH CHECK ((select has_permission('settings.write'::app_permission)));

CREATE POLICY "provider_role_permissions_admin_delete_policy"
  ON public.provider_role_permissions FOR DELETE
  USING ((select has_permission('settings.write'::app_permission)));
```

**Action:** This entire table and its policies will be dropped during migration.

## Policies That Will Remain Unchanged

### 1. Profiles Table - User-Specific Policies:

```sql
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 2. User Roles Table - User-Specific Policy:

```sql
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

## New has_role() Function

### Function Definition:

```sql
CREATE OR REPLACE FUNCTION public.has_role(
  requested_role app_role
) RETURNS BOOLEAN AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Get the user's role from JWT claims
  SELECT (auth.jwt() ->> 'user_role')::public.app_role INTO user_role;

  -- Return true if user has the requested role
  RETURN user_role = requested_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public';
```

### Alternative: Direct JWT Check (More Efficient)

Instead of creating a function, we can use direct JWT checks in policies:

```sql
-- Example: Admin role check
USING ((auth.jwt() ->> 'user_role')::public.app_role = 'admin')
```

## Migration Steps for RLS Policies

### Step 1: Create has_role() Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(
  requested_role app_role
) RETURNS BOOLEAN AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT (auth.jwt() ->> 'user_role')::public.app_role INTO user_role;
  RETURN user_role = requested_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public';
```

### Step 2: Drop Permission-Based Policies

```sql
-- Drop policies for tables that will be removed
DROP POLICY "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY "provider_role_permissions_admin_insert_policy" ON public.provider_role_permissions;
DROP POLICY "provider_role_permissions_admin_update_policy" ON public.provider_role_permissions;
DROP POLICY "provider_role_permissions_admin_delete_policy" ON public.provider_role_permissions;

-- Drop policies that will be replaced
DROP POLICY "Admins can view all profiles" ON public.profiles;
DROP POLICY "Admins can update any profile" ON public.profiles;
DROP POLICY "Admins can view all user roles" ON public.user_roles;
DROP POLICY "Admins can manage user roles" ON public.user_roles;
```

### Step 3: Create Role-Based Policies

```sql
-- Profiles table policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role('admin'));

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role('admin'));

-- User roles table policies
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (has_role('admin'));

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (has_role('admin'));
```

### Step 4: Update Grants

```sql
-- Remove grants for dropped tables
REVOKE ALL ON TABLE public.role_permissions FROM supabase_auth_admin;
REVOKE ALL ON TABLE public.provider_role_permissions FROM supabase_auth_admin;

-- Grant execute permission for new function
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
```

## Summary

**Policies to Drop:** 8 policies (4 for tables being removed, 4 to be replaced)
**Policies to Create:** 4 new role-based policies
**Policies Unchanged:** 3 user-specific policies
**New Function:** 1 has_role() function

**Security Impact:** No reduction in security - admin access remains restricted to admin role only.
