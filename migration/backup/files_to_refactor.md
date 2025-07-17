# Files to Refactor - AppPermission and Permission System Removal

## Files Using AppPermission Type

### 1. `app/auth/actions.ts`

**Usage:**

- Imports `AppPermission` type
- `getUserPermissionsForRole()` function returns `AppPermission[]`
- `getUserPermissions()` function returns `AppPermission[]`
- `hasPermission()` function takes `AppPermission` parameter

**Changes Needed:**

- Remove `AppPermission` import
- Remove `getUserPermissionsForRole()` function
- Remove `getUserPermissions()` function
- Remove `hasPermission()` function
- Simplify `getUserRole()` to return only role and provider_role

### 2. `hooks/use-auth.ts`

**Usage:**

- Imports `AppPermission` type
- `useUserPermissions()` hook returns `AppPermission[]`
- `useHasPermission()` hook takes `AppPermission` parameter
- `useRolePermissions()` and `useProviderRolePermissions()` hooks

**Changes Needed:**

- Remove `AppPermission` import
- Remove `useUserPermissions()` hook
- Remove `useHasPermission()` hook
- Remove `useRolePermissions()` hook
- Remove `useProviderRolePermissions()` hook
- Create role-based equivalents

### 3. `components/permission-guard.tsx`

**Usage:**

- Imports `AppPermission` type
- `PermissionGuard` component takes `permission: AppPermission` prop
- Uses `useHasPermission()` hook

**Changes Needed:**

- Remove `AppPermission` import
- Replace `PermissionGuard` with role-based guards
- Remove `useHasPermission()` usage
- Implement role-based checking logic

### 4. `app/dashboard/components/app-sidebar.tsx`

**Usage:**

- Uses `useHasPermission("users.read")` and `useHasPermission("dashboard.access")`
- Filters navigation items based on permissions

**Changes Needed:**

- Remove `useHasPermission()` calls
- Replace with role-based navigation filtering
- Use `useUserRole()` for access control

### 5. `types/supabase.ts`

**Usage:**

- Defines `app_permission` enum in database types
- Exports `AppPermission` type
- Contains `has_permission` function type

**Changes Needed:**

- Remove `app_permission` enum from database types
- Remove `AppPermission` type export
- Remove `has_permission` function type
- Update Constants to remove permission enum

### 6. `types/auth.types.ts`

**Usage:**

- May contain `AppPermission` type references
- Permission-related interfaces

**Changes Needed:**

- Remove `AppPermission` type references
- Remove permission-related interfaces
- Keep role-related types only

## Files Using Permission Tables

### 7. `hooks/use-supabase-query.ts`

**Usage:**

- `useRolePermissions()` hook queries `role_permissions` table
- `useProviderRolePermissions()` hook queries `provider_role_permissions` table
- `useRolePermissionsByRole()` and `useProviderRolePermissionsByRole()` hooks

**Changes Needed:**

- Remove all permission-related query hooks
- Remove table references to `role_permissions` and `provider_role_permissions`
- Keep only role-related queries

### 8. `app/dashboard/users/page.tsx`

**Usage:**

- Uses `useHasPermission("users.read")` for access control
- Permission-based conditional rendering

**Changes Needed:**

- Replace `useHasPermission()` with role-based checks
- Use admin role check instead of permission check

### 9. `app/dashboard/settings/page.tsx` (if exists)

**Usage:**

- Likely uses permission-based access control

**Changes Needed:**

- Replace permission checks with role-based checks

## Database Schema Files

### 10. `supabase/schema.sql`

**Usage:**

- Defines `app_permission` ENUM
- Creates `role_permissions` and `provider_role_permissions` tables
- Contains `has_permission()` function
- RLS policies using `has_permission()`

**Changes Needed:**

- Remove `app_permission` ENUM
- Drop `role_permissions` and `provider_role_permissions` tables
- Remove `has_permission()` function
- Update RLS policies to use role-based checks
- Create new `has_role()` function

## Documentation Files

### 11. `docs/index.md`

**Usage:**

- Documents permission system
- Lists permissions for each role

**Changes Needed:**

- Update documentation to reflect simplified role-based system
- Remove permission listings
- Update with new role-based access patterns

## Additional Files to Check

### 12. `components/auth-error-boundary.tsx`

**Usage:**

- Contains unused `PermissionGuard` component stub

**Changes Needed:**

- Remove unused permission-related code
- Update error handling for role-based system

### 13. Any test files (if they exist)

**Usage:**

- May contain permission-related tests

**Changes Needed:**

- Update tests to use role-based approach
- Remove permission-related test cases

## Summary

**Total Files to Modify:** 13+ files
**Main Categories:**

1. **Type Definitions:** 2 files (types/supabase.ts, types/auth.types.ts)
2. **Authentication Logic:** 2 files (app/auth/actions.ts, hooks/use-auth.ts)
3. **UI Components:** 3 files (components/permission-guard.tsx, app/dashboard/components/app-sidebar.tsx, components/auth-error-boundary.tsx)
4. **Pages:** 2+ files (app/dashboard/users/page.tsx, app/dashboard/settings/page.tsx)
5. **Database:** 1 file (supabase/schema.sql)
6. **Query Hooks:** 1 file (hooks/use-supabase-query.ts)
7. **Documentation:** 1 file (docs/index.md)

**Migration Priority:**

1. Database schema changes first
2. Type definitions
3. Authentication logic
4. UI components and pages
5. Documentation updates
