# Team Infrastructure Audit & Migration Strategy

**Migration:** 20251101000012_team_infrastructure_audit.md  
**Date:** November 1, 2025  
**Task:** Phase 3 - API & Backend Modifications - Pre-implementation Audit  
**Status:** 🔍 ANALYSIS COMPLETE

---

## Executive Summary

**CRITICAL FINDING: The "teams" infrastructure in the codebase refers to PROVIDER MEMBERS (staff), NOT operational teams for location-based dispatch.**

### Current "Team" Implementation

The existing codebase uses "team" terminology to refer to **provider members** (staff management):
- ✅ `app/(provider)/dashboard/team/` - Provider member management UI
- ✅ `/api/providers/[providerId]/team/` - Member invitation/creation endpoints
- ✅ `useTeamMembers()` hook - Fetches `provider_members` table
- ✅ "Team members" = Staff members with login access

### New "Teams" Requirement

The Phase 1 migrations created a **NEW `teams` table** for operational dispatch:
- ✅ `public.teams` table - Location-based operational teams
- ✅ `team_id` column in `provider_members` - Links staff to operational teams
- ✅ `team_id` column in `bookings` - Assigns bookings to operational teams
- ✅ Team capacity management (daily_capacity, max_concurrent_events)

### Terminology Conflict

| Term | Current Meaning | New Meaning |
|------|----------------|-------------|
| **"Team"** | Provider members (staff) | Operational teams at locations |
| **"Team members"** | All staff in provider | Staff assigned to a specific operational team |
| **"Team page"** | Staff management UI | (Will need) Operational team management UI |
| **`useTeamMembers()`** | Fetches provider_members | (Will need) Hook for operational teams |

---

## Detailed Findings

### 1. Database Schema Analysis

#### ✅ Existing Tables (Pre-Phase 1)

**`provider_members` table:**
```sql
CREATE TABLE provider_members (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role provider_role NOT NULL,  -- owner, admin, manager, staff, viewer
  status provider_member_status NOT NULL,  -- pending, active, suspended
  invitation_method invitation_method,  -- email_invite, admin_created, onboarding
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Purpose:** Manages staff members who have login access to the provider dashboard.

#### ✅ New Tables (Phase 1 Migrations)

**`teams` table (Migration 20251101000002):**
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id),
  service_location_id UUID NOT NULL REFERENCES service_locations(id),
  name TEXT NOT NULL,
  description TEXT,
  daily_capacity INTEGER,
  max_concurrent_events INTEGER,
  status team_status NOT NULL DEFAULT 'active',  -- active, inactive, archived
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);
```

**Purpose:** Operational teams assigned to service locations for handling bookings.

**`provider_members.team_id` (Migration 20251101000003):**
```sql
ALTER TABLE provider_members
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
```

**Purpose:** Links staff members to operational teams.

**`bookings.team_id` (Migration 20251101000004):**
```sql
ALTER TABLE bookings
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
```

**Purpose:** Assigns bookings to operational teams.

---

### 2. API Endpoints Analysis

#### ✅ Existing Endpoints (Provider Member Management)

| Endpoint | Purpose | Table | Status |
|----------|---------|-------|--------|
| `GET /api/providers/[providerId]/members` | List provider members | `provider_members` | ✅ Keep as-is |
| `POST /api/providers/[providerId]/invitations` | Invite new member | `provider_invitations` | ✅ Keep as-is |
| `POST /api/providers/[providerId]/team/admin-create` | Create member account | `provider_members` | ✅ Keep as-is |
| `PATCH /api/providers/[providerId]/members/[memberId]/role` | Update member role | `provider_members` | ✅ Keep as-is |
| `PATCH /api/providers/[providerId]/members/[memberId]/status` | Update member status | `provider_members` | ✅ Keep as-is |
| `DELETE /api/providers/[providerId]/members/[memberId]` | Remove member | `provider_members` | ✅ Keep as-is |

**Conclusion:** All existing endpoints are for provider member management. **NO CONFLICTS** with new operational teams.

#### ❌ Missing Endpoints (Operational Team Management)

**Required new endpoints:**
- `GET /api/providers/[providerId]/teams` - List operational teams
- `POST /api/providers/[providerId]/teams` - Create operational team
- `GET /api/providers/[providerId]/teams/[teamId]` - Get team details
- `PATCH /api/providers/[providerId]/teams/[teamId]` - Update team
- `DELETE /api/providers/[providerId]/teams/[teamId]` - Delete/archive team
- `GET /api/providers/[providerId]/teams/[teamId]/members` - List team members
- `POST /api/providers/[providerId]/teams/[teamId]/members` - Assign member to team
- `DELETE /api/providers/[providerId]/teams/[teamId]/members/[memberId]` - Remove member from team

---

### 3. UI Components Analysis

#### ✅ Existing UI (Provider Member Management)

| Component | Purpose | Data Source | Status |
|-----------|---------|-------------|--------|
| `app/(provider)/dashboard/team/page.tsx` | Staff management page | `provider_members` | ✅ Keep as-is |
| `InviteMemberModal` | Invite staff modal | `provider_invitations` | ✅ Keep as-is |
| `AddStaffModal` | Create staff account | `provider_members` | ✅ Keep as-is |
| `EditRoleDrawer` | Edit staff role | `provider_members` | ✅ Keep as-is |
| `TeamMemberActions` | Staff action menu | `provider_members` | ✅ Keep as-is |
| `useTeamMembers()` hook | Fetch staff members | `provider_members` | ✅ Keep as-is |

**Conclusion:** All existing UI is for provider member management. **NO CONFLICTS** with new operational teams.

#### ❌ Missing UI (Operational Team Management)

**Required new UI:**
- `app/(provider)/dashboard/teams/page.tsx` - Operational teams management page
- `CreateTeamModal` - Create new operational team
- `EditTeamDrawer` - Edit team details and capacity
- `TeamMembersDialog` - Assign/remove staff from team
- `useTeams()` hook - Fetch operational teams
- `useTeamMembers(teamId)` hook - Fetch members of a specific operational team

---

### 4. TypeScript Types Analysis

#### ✅ Existing Types (Provider Members)

**Location:** `app/(provider)/dashboard/team/hooks/use-team-members.ts`
```typescript
export type ProviderMember = Tables<"provider_members"> & {
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
};

export type TeamMemberWithUser = ProviderMember & {
  full_name: string;
  email: string;
  avatar_url?: string;
  last_active?: string;
};
```

**Conclusion:** These types are for provider members. **NO CONFLICTS** with new operational teams.

#### ❌ Missing Types (Operational Teams)

**Required new types:**
```typescript
// types/supabase.ts (auto-generated after migrations applied)
export type Team = Tables<"teams">;
export type TeamStatus = Enums<"team_status">;

// New hook types needed
export type TeamWithLocation = Team & {
  service_location: {
    city: string;
    province: string;
  };
};

export type TeamWithMembers = Team & {
  members: ProviderMember[];
  member_count: number;
};
```

---

## Migration Strategy

### ✅ Phase 1: Apply Database Migrations (COMPLETED)

All Phase 1 migrations have been created:
- ✅ `20251101000001_add_service_location_to_bookings.sql`
- ✅ `20251101000002_create_teams_table.sql`
- ✅ `20251101000003_add_team_to_provider_members.sql`
- ✅ `20251101000004_add_team_to_bookings.sql`
- ✅ `20251101000005_add_capacity_to_service_locations.sql`
- ✅ `20251101000006_create_team_helper_functions.sql`

**Next Step:** Apply migrations to database and regenerate TypeScript types.

---

### ✅ Phase 2: RLS Policies & Security (COMPLETED)

All Phase 2 tasks have been completed:
- ✅ Audit and cleanup existing RLS policies
- ✅ Update bookings policies for team-based access
- ✅ Verify audit triggers capture team assignments

---

### 🔄 Phase 3: API & Backend Modifications (IN PROGRESS)

#### Strategy: CREATE NEW endpoints, KEEP EXISTING endpoints

**Rationale:**
- Existing `/api/providers/[providerId]/members` endpoints are for provider member management
- New `/api/providers/[providerId]/teams` endpoints will be for operational team management
- **NO CONFLICTS** - Different resources, different purposes

#### Required New Endpoints:

1. **`GET /api/providers/[providerId]/teams`**
   - List all operational teams for a provider
   - Filter by service_location_id, status
   - Include member count, capacity info

2. **`POST /api/providers/[providerId]/teams`**
   - Create new operational team
   - Require manager+ role
   - Validate service_location_id belongs to provider

3. **`GET /api/providers/[providerId]/teams/[teamId]`**
   - Get team details with members
   - Include capacity utilization stats

4. **`PATCH /api/providers/[providerId]/teams/[teamId]`**
   - Update team details, capacity, status
   - Require manager+ role

5. **`DELETE /api/providers/[providerId]/teams/[teamId]`**
   - Soft delete (set status = 'archived')
   - Require manager+ role

6. **`PATCH /api/providers/[providerId]/members/[memberId]`**
   - **EXTEND EXISTING** endpoint to support `team_id` field
   - Allow assigning/removing staff from operational teams

---

### 🔄 Phase 4: Client & Frontend Updates (PLANNED)

#### Strategy: CREATE NEW pages/components, KEEP EXISTING staff management UI

**Rationale:**
- Existing `app/(provider)/dashboard/team/` is for staff management
- New `app/(provider)/dashboard/teams/` will be for operational team management
- **NO CONFLICTS** - Different features, different URLs

#### Required New UI:

1. **`app/(provider)/dashboard/teams/page.tsx`**
   - Operational teams management page
   - DataTable with teams list
   - Filter by location, status
   - Create/Edit/Archive actions

2. **`app/(provider)/dashboard/teams/components/create-team-modal.tsx`**
   - Form to create new operational team
   - Select service location
   - Set capacity limits

3. **`app/(provider)/dashboard/teams/components/edit-team-drawer.tsx`**
   - Edit team details
   - Update capacity settings
   - Change status

4. **`app/(provider)/dashboard/teams/components/team-members-dialog.tsx`**
   - Assign/remove staff from team
   - Multi-select combobox for staff
   - Show current team members

5. **`app/(provider)/dashboard/teams/hooks/use-teams.ts`**
   - `useTeams(providerId)` - List teams
   - `useTeam(teamId)` - Get team details
   - `useCreateTeam()` - Create team mutation
   - `useUpdateTeam()` - Update team mutation
   - `useDeleteTeam()` - Delete team mutation
   - `useAssignMemberToTeam()` - Assign member mutation

6. **Update `app/(provider)/dashboard/team/page.tsx`** (Staff Management)
   - Add "Team" column to staff table showing assigned operational team
   - Add team filter to staff list
   - Add team assignment action to staff actions menu

7. **Update `app/(provider)/dashboard/bookings/` components**
   - Add team selection to booking creation/edit forms
   - Show team assignment in booking details
   - Update `AssignTeammateDialog` to support team-based assignment

---

## Compatibility Matrix

| Feature | Existing (Provider Members) | New (Operational Teams) | Conflict? |
|---------|----------------------------|------------------------|-----------|
| **Database Table** | `provider_members` | `teams` | ❌ No |
| **API Path** | `/api/providers/[id]/members` | `/api/providers/[id]/teams` | ❌ No |
| **UI Path** | `/dashboard/team` | `/dashboard/teams` | ❌ No |
| **Hook Name** | `useTeamMembers()` | `useTeams()` | ❌ No |
| **Query Key** | `["team", "members", providerId]` | `["teams", providerId]` | ❌ No |
| **Terminology** | "Team members" = Staff | "Teams" = Operational teams | ⚠️ Clarify in UI |

---

## Recommendations

### 1. ✅ Keep All Existing Code As-Is

**Rationale:**
- Existing "team" code is for provider member management
- New "teams" code is for operational team management
- Different purposes, different data models
- **NO BREAKING CHANGES** needed

### 2. ✅ Create Parallel Infrastructure

**Approach:**
- New API routes: `/api/providers/[id]/teams/*`
- New UI pages: `/dashboard/teams/*`
- New hooks: `useTeams()`, `useTeam()`, etc.
- New components: `CreateTeamModal`, `EditTeamDrawer`, etc.

### 3. ⚠️ Clarify Terminology in UI

**User-facing labels:**
- "Staff members" instead of "Team members" (for provider_members)
- "Operational teams" or "Service teams" (for teams table)
- "Team assignment" (for assigning staff to operational teams)

### 4. ✅ Extend Existing Member Management

**Add to staff management UI:**
- "Team" column showing assigned operational team
- Team filter in staff list
- Team assignment action in staff actions menu

---

## Next Steps

### Immediate Actions (Phase 3):

1. **Apply Phase 1 & 2 migrations to database**
   ```bash
   # Apply all pending migrations
   supabase db push
   
   # Regenerate TypeScript types
   npx supabase gen types typescript --project-id ghfnyprmnluutpcacdjp > types/supabase.ts
   ```

2. **Create operational team management API endpoints**
   - `GET /api/providers/[providerId]/teams`
   - `POST /api/providers/[providerId]/teams`
   - `GET /api/providers/[providerId]/teams/[teamId]`
   - `PATCH /api/providers/[providerId]/teams/[teamId]`
   - `DELETE /api/providers/[providerId]/teams/[teamId]`

3. **Extend member management API**
   - Update `PATCH /api/providers/[providerId]/members/[memberId]` to support `team_id`

4. **Create operational team management UI**
   - New page: `app/(provider)/dashboard/teams/page.tsx`
   - New hooks: `app/(provider)/dashboard/teams/hooks/use-teams.ts`
   - New components: Create/Edit/Delete modals

5. **Update booking management UI**
   - Add team selection to booking forms
   - Update `AssignTeammateDialog` for team-based assignment

---

## Conclusion

**✅ NO CONFLICTS FOUND**

The existing "team" infrastructure is for **provider member management** (staff with login access), while the new "teams" table is for **operational team management** (location-based dispatch teams).

**Migration Strategy: Parallel Implementation**
- Keep all existing code as-is
- Create new parallel infrastructure for operational teams
- Extend existing staff management to support team assignment
- Clarify terminology in UI to avoid confusion

**Estimated Effort:**
- Phase 3 (API): ~8 new endpoints + 1 extension = **2-3 days**
- Phase 4 (UI): ~1 new page + 5 components + 1 hook file = **3-4 days**
- Testing & Integration: **1-2 days**
- **Total: 6-9 days**


