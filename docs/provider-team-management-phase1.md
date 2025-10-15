# Provider Team Management System - Phase 1 Documentation

## Overview
This document describes the implementation of Phase 1 (Data & Security) of the Provider Team Management System for CateringHub.

**Implementation Date:** October 15, 2025  
**Status:** ✅ Complete

---

## Phase 1: Data & Security - Completed Tasks

### ✅ Task 1: Create Database Tables

Created three new tables with proper constraints and indexes:

#### 1. `providers` Table
- **Purpose:** Container for provider organizations/teams
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `catering_provider_id` (UUID, FK to catering_providers)
  - Timestamps: `created_at`, `updated_at`
- **Constraints:**
  - Unique constraint on `catering_provider_id`
  - Foreign key to `catering_providers` table
- **Indexes:**
  - `idx_providers_catering_provider`
  - `idx_providers_created_at`

#### 2. `provider_members` Table
- **Purpose:** Team membership with roles and status
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `provider_id` (UUID, FK to providers)
  - `user_id` (UUID, FK to auth.users)
  - `role` (provider_role enum, default: 'viewer')
  - `status` (provider_member_status enum, default: 'pending')
  - `invited_by`, `invited_at`, `joined_at` (invitation tracking)
  - Timestamps: `created_at`, `updated_at`
- **Constraints:**
  - **Unique constraint:** `(provider_id, user_id)` - prevents duplicate memberships
  - Foreign keys to `providers` and `auth.users`
- **Indexes:**
  - `idx_provider_members_provider`
  - `idx_provider_members_user`
  - `idx_provider_members_status`
  - `idx_provider_members_role`
  - `idx_provider_members_provider_status`

#### 3. `provider_invitations` Table
- **Purpose:** Pending team invitations
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `provider_id` (UUID, FK to providers)
  - `email` (TEXT, NOT NULL)
  - `role` (provider_role enum, default: 'viewer')
  - `invited_by` (UUID, FK to auth.users)
  - `token` (TEXT, UNIQUE) - secure invitation token
  - `expires_at` (TIMESTAMPTZ)
  - `accepted_at` (TIMESTAMPTZ)
  - Timestamps: `created_at`, `updated_at`
- **Constraints:**
  - Unique constraint on `(provider_id, email)` - prevents duplicate pending invitations
  - Unique constraint on `token`
- **Indexes:**
  - `idx_provider_invitations_provider`
  - `idx_provider_invitations_email`
  - `idx_provider_invitations_token`
  - `idx_provider_invitations_expires`
  - `idx_provider_invitations_pending` (partial index for active invitations)

---

### ✅ Task 2: Create Enums for Roles and Status

#### `provider_role` Enum
Hierarchical roles with decreasing privilege levels:
- `owner` - Full control over provider and team
- `admin` - Can manage team members and most settings
- `manager` - Can manage bookings and assignments
- `staff` - Can view assigned bookings only
- `viewer` - Read-only access to provider data

**Default Value:** `'viewer'`

#### `provider_member_status` Enum
Membership status values:
- `pending` - Invitation sent but not accepted
- `active` - Active team member
- `suspended` - Temporarily suspended access

**Default Value:** `'pending'`

---

### ✅ Task 3: Implement Row Level Security (RLS) Policies

All tables have RLS enabled with comprehensive policies:

#### Helper Function: `is_provider_member()`
```sql
is_provider_member(
  p_provider_id UUID,
  p_user_id UUID DEFAULT auth.uid(),
  p_min_role provider_role DEFAULT 'viewer'
) RETURNS BOOLEAN
```
- Checks if user is an active member with at least the specified role
- Uses role hierarchy: owner > admin > manager > staff > viewer
- Returns `FALSE` if user is not a member or has insufficient privileges

#### RLS Policies Summary

**`providers` Table:**
- ✅ SELECT: Members can view their providers (viewer+)
- ✅ INSERT: Authenticated users can create providers
- ✅ UPDATE: Owners and admins can update (admin+)
- ✅ DELETE: Only owners can delete (owner only)

**`provider_members` Table:**
- ✅ SELECT: Members can view team members (viewer+)
- ✅ INSERT: Admins can add members (admin+)
- ✅ UPDATE: Admins can update any member OR users can accept their own invitation
- ✅ DELETE: Admins can remove members OR users can leave the team

**`provider_invitations` Table:**
- ✅ SELECT: Members can view invitations OR invited users can view their own
- ✅ INSERT: Admins can create invitations (admin+)
- ✅ UPDATE: Invited users can accept their own valid invitations
- ✅ DELETE: Admins can revoke invitations (admin+)

**`bookings` Table:**
- ✅ SELECT: 
  - Owners/admins/managers see all provider bookings
  - Staff see only their assigned bookings
  - Customers see their own bookings
- ✅ INSERT: Customers and provider members can create bookings
- ✅ UPDATE:
  - Managers+ can update any booking
  - Staff can update their assigned bookings
  - Customers can update their pending bookings
- ✅ DELETE: Admins+ can delete OR customers can delete pending bookings

#### Auto-Owner Trigger
- **Function:** `handle_new_provider()`
- **Trigger:** `on_provider_created`
- **Behavior:** Automatically adds the creator as an owner when a provider is created
- **Note:** Gracefully handles NULL `auth.uid()` for seed scripts

---

### ✅ Task 4: Add Assignment Tracking to Bookings

Created `bookings` table with assignment tracking:

#### New Table: `bookings`
- **Purpose:** Customer bookings with team member assignment
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `provider_id` (UUID, FK to providers)
  - `customer_id` (UUID, FK to auth.users, nullable)
  - **`assigned_to` (UUID, FK to auth.users, nullable)** ← Assignment tracking
  - Event details: `event_date`, `event_time`, `event_type`, `guest_count`
  - Location: `venue_name`, `venue_address`
  - `status` (booking_status enum)
  - Contact: `customer_name`, `customer_email`, `customer_phone`
  - Timestamps: `created_at`, `updated_at`, `confirmed_at`, `completed_at`, `cancelled_at`

#### `booking_status` Enum
- `pending` - Initial inquiry/request
- `confirmed` - Booking confirmed by provider
- `in_progress` - Event is happening or being prepared
- `completed` - Event finished successfully
- `cancelled` - Booking cancelled

#### Indexes for Assignment Tracking
- ✅ `idx_bookings_assigned_to` - Fast lookup by assigned staff
- ✅ `idx_bookings_assigned_status` - Partial index for assigned bookings
- ✅ `idx_bookings_provider_assigned_status` - Composite index for common queries

**Note:** All existing rows would have `assigned_to = NULL` (no existing bookings table before this migration)

---

### ✅ Task 5: Create Seed Data for Development

Created comprehensive seed data with realistic test scenarios:

#### Seed Data Created:
1. **1 Provider Organization**
   - Name: "LeyteCater Team"
   - Linked to existing catering provider

2. **4 Active Team Members:**
   - 1 Owner (joined 90 days ago)
   - 1 Admin (joined 59 days ago)
   - 1 Manager (joined 44 days ago)
   - 1 Staff (joined 29 days ago)

3. **2 Pending Invitations:**
   - newstaff@test.com (staff role)
   - viewer2@test.com (viewer role)

4. **5 Sample Bookings:**
   - ✅ 1 Confirmed booking (assigned to staff, 14 days future)
   - ⏳ 1 In-progress booking (assigned to staff, 3 days future)
   - 📋 1 Pending booking (unassigned, 21 days future)
   - ✔️ 1 Completed booking (assigned to staff, 7 days past)
   - ❌ 1 Cancelled booking (unassigned, 30 days future)

#### Seed Script Location
- **File:** `supabase/seed.sql`
- **Execution:** Run via Supabase SQL Editor or migration

---

## Database Migrations Applied

All migrations successfully applied to project `ghfnyprmnluutpcacdjp`:

1. `20251015000001_create_provider_team_management_schema.sql`
   - Created enums and tables
   - Added indexes and constraints

2. `20251015000002_create_provider_team_rls_policies.sql`
   - Enabled RLS on all tables
   - Created helper function
   - Implemented comprehensive RLS policies

3. `20251015000003_create_provider_auto_owner_trigger.sql`
   - Created auto-owner trigger function
   - Handles NULL auth.uid() gracefully

4. `20251015000004_fix_provider_auto_owner_trigger.sql`
   - Fixed trigger to work with seed scripts

5. `20251015000005_create_bookings_with_assignment_tracking.sql`
   - Created bookings table
   - Added assignment tracking column
   - Implemented booking RLS policies

---

## Acceptance Criteria Verification

### ✅ Task 1: Create Database Tables
- [x] Schema successfully migrated
- [x] FK constraints enforced
- [x] Unique constraint prevents duplicate memberships `(provider_id, user_id)`
- [x] All indexes created for performance

### ✅ Task 2: Create Enums
- [x] `provider_role` enum exists with 5 values
- [x] `provider_member_status` enum exists with 3 values
- [x] Default values applied: `role = 'viewer'`, `status = 'pending'`

### ✅ Task 3: RLS Policies
- [x] RLS policies enforce access control
- [x] Non-members cannot access provider data
- [x] Role-based permissions work correctly:
  - Owners/admins: full access
  - Managers: can manage bookings
  - Staff: limited to assigned bookings
  - Viewers: read-only access

### ✅ Task 4: Assignment Tracking
- [x] `assigned_to` column exists in bookings table
- [x] Existing queries unaffected (no pre-existing bookings)
- [x] Indexes created on `assigned_to`
- [x] All rows have `assigned_to = NULL` by default

### ✅ Task 5: Seed Data
- [x] Seed script runs successfully
- [x] Creates realistic test data across all roles
- [x] Bookings include both assigned and unassigned records
- [x] Data verified in database

---

## Security Audit Results

Ran security advisors - **No RLS issues detected** ✅

Minor warnings (unrelated to provider team management):
- Some existing functions need `search_path` fixes
- Leaked password protection disabled (auth config)

---

## Next Steps (Future Phases)

### Phase 2: API & Business Logic
- Create API endpoints for team management
- Implement invitation acceptance flow
- Add assignment management functions
- Create booking assignment logic

### Phase 3: UI Components
- Team management dashboard
- Member invitation interface
- Booking assignment interface
- Role-based UI rendering

### Phase 4: Testing & Documentation
- Unit tests for RLS policies
- Integration tests for team workflows
- API documentation
- User guides

---

## Testing Queries

### Verify Team Members
```sql
SELECT 
  pm.role,
  pm.status,
  u.email,
  pm.joined_at IS NOT NULL as has_joined
FROM provider_members pm
JOIN auth.users u ON pm.user_id = u.id
ORDER BY 
  CASE pm.role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 4
    WHEN 'viewer' THEN 5
  END;
```

### Verify Bookings with Assignments
```sql
SELECT 
  event_type,
  status,
  CASE WHEN assigned_to IS NOT NULL THEN 'Assigned' ELSE 'Unassigned' END as assignment_status,
  guest_count,
  event_date
FROM bookings
ORDER BY event_date;
```

### Test RLS Policy (as staff member)
```sql
-- Set session to staff user
SET request.jwt.claims.sub = '6977ac22-4891-4873-8ba8-3fd0f1981e3d';

-- Should only see assigned bookings
SELECT * FROM bookings;
```

---

## Summary

✅ **All Phase 1 tasks completed successfully!**

- 3 new tables created with proper constraints
- 2 enums for roles and status
- Comprehensive RLS policies implemented
- Assignment tracking added to bookings
- Realistic seed data created

The database schema is now ready for Phase 2 (API & Business Logic) implementation.

