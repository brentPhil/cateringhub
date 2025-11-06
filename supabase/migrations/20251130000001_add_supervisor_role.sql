-- ============================================================================
-- ADD SUPERVISOR ROLE TO PROVIDER_ROLE ENUM
-- ============================================================================
-- Migration: 20251130000001_add_supervisor_role.sql
-- Date: November 30, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Add 'supervisor' role to the provider_role enum to support team-based
--   hierarchy. Supervisors manage workers, shifts, and bookings within their
--   assigned team only, while managers have provider-wide access.
--
-- Role Hierarchy (after this migration):
--   owner > admin > manager > supervisor > staff > viewer
--
-- Changes:
--   1. Add 'supervisor' value to provider_role enum
--   2. Update role hierarchy documentation
--
-- Notes:
--   - This is a non-breaking change (additive only)
--   - Existing data is not affected
--   - Frontend constants will be updated via type generation
--
-- Estimated Time: < 1 second
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: ADD SUPERVISOR TO ENUM
-- ============================================================================

-- Add 'supervisor' to provider_role enum
-- Position: between 'manager' and 'staff'
ALTER TYPE public.provider_role ADD VALUE IF NOT EXISTS 'supervisor' BEFORE 'staff';

-- ============================================================================
-- PHASE 2: ADD DOCUMENTATION
-- ============================================================================

-- Update enum comment to reflect new hierarchy
COMMENT ON TYPE public.provider_role IS 
'Provider member role hierarchy: owner > admin > manager > supervisor > staff > viewer.
- owner: Full control, billing, subscription management (provider-wide)
- admin: Manages provider operations, can add/remove managers and supervisors (provider-wide)
- manager: Oversees all service locations and teams (provider-wide)
- supervisor: Manages workers, shifts, and bookings within assigned team only (team-specific)
- staff: Regular worker assigned to a team (team-specific)
- viewer: Read-only access to analytics and reports (provider-wide)';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these manually to verify migration)
-- ============================================================================

-- Verify enum values and order:
-- SELECT enumlabel, enumsortorder
-- FROM pg_enum
-- WHERE enumtypid = 'public.provider_role'::regtype
-- ORDER BY enumsortorder;
--
-- Expected output:
-- owner      | 1
-- admin      | 2
-- manager    | 3
-- supervisor | 4
-- staff      | 5
-- viewer     | 6

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- Note: PostgreSQL does not support removing enum values directly.
-- To rollback, you would need to:
-- 1. Ensure no records use 'supervisor' role
-- 2. Create a new enum without 'supervisor'
-- 3. Alter all tables to use the new enum
-- 4. Drop the old enum
-- This is complex and should be avoided. Instead, simply don't use the role.
-- ============================================================================

