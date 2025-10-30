# CateringHub Infrastructure Audit - Technical Details

**Date:** 2025-10-28  
**Scope:** Bookings & Assignment Infrastructure for Location/Team-Based Dispatch Redesign

---

## Table of Contents
1. [Database Catalog](#1-database-catalog)
2. [RLS Matrix](#2-rls-matrix)
3. [API Map](#3-api-map)
4. [Client Map](#4-client-map)
5. [Assignment Flow Diagrams](#5-assignment-flow-diagrams)
6. [Evidence Log](#6-evidence-log)
7. [Assumptions & Fallbacks](#7-assumptions--fallbacks)
8. [Machine-Readable JSON](#8-machine-readable-json)

---

## 1. Database Catalog

### 1.1 Core Tables

#### `bookings` ⚠️ **CRITICAL FOR REDESIGN**

**Purpose:** Core booking entity with individual assignment model

**Columns:**
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `provider_id` | uuid | NO | - | FK → providers(id) ON DELETE CASCADE |
| `customer_id` | uuid | YES | - | FK → auth.users(id) ON DELETE SET NULL |
| `assigned_to` | uuid | YES | - | FK → auth.users(id) ON DELETE SET NULL ⚠️ |
| `event_date` | date | NO | - | - |
| `event_time` | time | YES | - | - |
| `status` | booking_status | NO | 'pending' | ENUM |
| `source` | booking_source | NO | 'auto' | ENUM (immutable via trigger) |
| `created_by` | uuid | YES | - | FK → auth.users(id), auto-set via trigger |
| `venue_address` | text | YES | - | - |
| `base_price` | numeric(10,2) | YES | - | - |
| `total_price` | numeric(10,2) | YES | - | Auto-calculated via trigger |
| `created_at` | timestamptz | NO | `now()` | - |
| `updated_at` | timestamptz | NO | `now()` | Auto-updated via trigger |
| `confirmed_at` | timestamptz | YES | - | - |
| `completed_at` | timestamptz | YES | - | - |
| `cancelled_at` | timestamptz | YES | - | - |

**Indexes:**
- `bookings_pkey` (PRIMARY KEY on `id`)
- `idx_bookings_assigned_to` (on `assigned_to`) ⚠️ Individual assignment pattern
- `idx_bookings_assigned_status` (on `assigned_to, status` WHERE `assigned_to IS NOT NULL`)
- `idx_bookings_provider_assigned_status` (on `provider_id, assigned_to, status`)
- `idx_bookings_provider_event_date_status` (on `provider_id, event_date DESC, status`)
- `idx_bookings_provider_status` (on `provider_id, status`)

**RLS Policies:**
- `Provider members can view bookings` (SELECT): Staff see only `assigned_to = auth.uid()`, managers see all
- `Provider members can update bookings` (UPDATE): Staff can only update their assigned bookings
- `Provider members can insert bookings` (INSERT): Manager+ can create
- `Provider members can delete bookings` (DELETE): Manager+ can delete
- `Customers can view their bookings` (SELECT): `customer_id = auth.uid()`

**Triggers:**
- `trigger_audit_booking_changes` → `audit_booking_changes()` (logs to `booking_audits`)
- `set_booking_created_by_trigger` → `set_created_by()` (auto-sets `created_by`)
- `prevent_booking_source_change_trigger` → `prevent_source_change()` (immutable `source`)
- `calculate_booking_total_price_insert/update` → `calculate_total_price()` (auto-calc pricing)

**Gap Analysis:**
- ❌ No `service_location_id` column → cannot link bookings to service locations
- ❌ No `team_id` column → cannot assign to teams
- ⚠️ `assigned_to` is individual-based → blocks concurrent team events
- ⚠️ Indexes optimized for `assigned_to` queries → need new indexes for location/team queries

---

#### `service_locations` ✅ **EXISTS BUT NOT INTEGRATED**

**Purpose:** Multi-location support for providers (added recently, not used in booking flow)

**Columns:**
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `provider_id` | uuid | NO | - | FK → providers(id) ON DELETE CASCADE |
| `province` | text | YES | - | - |
| `city` | text | YES | - | - |
| `barangay` | text | YES | - | - |
| `street_address` | text | YES | - | - |
| `postal_code` | text | YES | - | - |
| `is_primary` | boolean | NO | false | Only one per provider (enforced via trigger) |
| `service_radius` | integer | NO | 50 | km, validated via trigger |
| `landmark` | text | YES | - | - |
| `service_area_notes` | text | YES | - | - |
| `created_at` | timestamptz | NO | `now()` | - |
| `updated_at` | timestamptz | NO | `now()` | - |

**Indexes:**
- `service_locations_pkey` (PRIMARY KEY on `id`)
- `idx_service_locations_provider_id` (on `provider_id`)
- `idx_service_locations_provider_primary` (on `provider_id, is_primary`)
- `idx_service_locations_service_radius` (on `service_radius`)

**RLS Policies:**
- `Team members can view service locations` (SELECT): Active provider members
- `Team members can insert service locations` (INSERT): Manager+ role
- `Team members can update service locations` (UPDATE): Manager+ role
- `Team members can delete service locations` (DELETE): Manager+ role

**Triggers:**
- `trigger_ensure_single_primary_location` → `ensure_single_primary_location()` (enforces one `is_primary`)
- `trigger_enforce_max_service_radius` → `enforce_max_service_radius()` (validates against `providers.max_service_radius`)

**Gap Analysis:**
- ❌ No `daily_capacity` or `max_concurrent_events` columns → cannot enforce per-location capacity
- ❌ No link to `bookings` table → orphaned from assignment flow
- ❌ No link to teams → cannot assign teams to locations

---

#### `provider_members` ✅ **TEAM STRUCTURE EXISTS, NO TEAM GROUPING**

**Purpose:** Team members with role hierarchy

**Columns:**
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `provider_id` | uuid | NO | - | FK → providers(id) ON DELETE CASCADE |
| `user_id` | uuid | NO | - | FK → auth.users(id) ON DELETE CASCADE |
| `role` | provider_role | NO | 'viewer' | ENUM: owner, admin, manager, staff, viewer |
| `status` | provider_member_status | NO | 'pending' | ENUM: pending, active, suspended |
| `invitation_method` | invitation_method | YES | - | ENUM: email_invite, admin_created, onboarding |
| `created_at` | timestamptz | NO | `now()` | - |
| `updated_at` | timestamptz | NO | `now()` | - |

**Unique Constraints:**
- `unique_provider_user` (on `provider_id, user_id`) → one membership per user per provider

**Indexes:**
- `provider_members_pkey` (PRIMARY KEY on `id`)
- `idx_provider_members_provider` (on `provider_id`)
- `idx_provider_members_provider_status` (on `provider_id, status`)
- `idx_provider_members_user` (on `user_id`)

**RLS Policies:**
- `Members can view their own membership` (SELECT): `user_id = auth.uid()` OR active member
- `Admins can insert members` (INSERT): Admin+ role
- `Admins can update members` (UPDATE): Admin+ role
- `Admins can delete members` (DELETE): Admin+ role

**Gap Analysis:**
- ❌ No `team_id` column → cannot group members into location-based teams
- ⚠️ Flat structure → all members are equal within a role, no team hierarchy

---

#### `shifts` ✅ **PARTIAL TEAM CONCEPT**

**Purpose:** Crew assignments to bookings (supports multiple workers per booking)

**Columns:**
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `booking_id` | uuid | NO | - | FK → bookings(id) ON DELETE CASCADE |
| `user_id` | uuid | YES | - | FK → auth.users(id) ON DELETE SET NULL |
| `worker_profile_id` | uuid | YES | - | FK → worker_profiles(id) ON DELETE SET NULL |
| `role` | text | YES | - | Job role (e.g., "Server", "Chef") |
| `scheduled_start` | timestamptz | YES | - | - |
| `scheduled_end` | timestamptz | YES | - | - |
| `actual_start` | timestamptz | YES | - | - |
| `actual_end` | timestamptz | YES | - | - |
| `status` | text | YES | - | scheduled, checked_in, checked_out, cancelled |
| `created_at` | timestamptz | NO | `now()` | - |
| `updated_at` | timestamptz | NO | `now()` | - |

**Indexes:**
- `shifts_pkey` (PRIMARY KEY on `id`)
- `idx_shifts_booking_id` (on `booking_id`)
- `idx_shifts_user_id` (on `user_id`)
- `idx_shifts_worker_profile_id` (on `worker_profile_id`)

**RLS Policies:**
- `Provider members can view shifts` (SELECT): Members of booking's provider
- `Provider members can manage shifts` (INSERT/UPDATE/DELETE): Manager+ role

**Gap Analysis:**
- ✅ Already supports multiple workers per booking (good for team concept)
- ⚠️ No `team_id` → cannot assign entire team to a booking
- ⚠️ Individual assignment (`user_id` or `worker_profile_id`) → still person-centric

---

#### `worker_profiles` ✅ **NON-LOGIN STAFF**

**Purpose:** Non-login staff members for shift assignments

**Columns:**
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `provider_id` | uuid | NO | - | FK → providers(id) ON DELETE CASCADE |
| `full_name` | text | NO | - | - |
| `phone` | text | YES | - | - |
| `email` | text | YES | - | - |
| `status` | worker_status | NO | 'active' | ENUM: active, inactive |
| `created_at` | timestamptz | NO | `now()` | - |
| `updated_at` | timestamptz | NO | `now()` | - |

**Indexes:**
- `worker_profiles_pkey` (PRIMARY KEY on `id`)
- `idx_worker_profiles_provider_id` (on `provider_id`)
- `idx_worker_profiles_provider_status` (on `provider_id, status`)

**RLS Policies:**
- `Provider members can view worker profiles` (SELECT): Active members
- `Provider members can manage worker profiles` (INSERT/UPDATE/DELETE): Manager+ role

**Gap Analysis:**
- ❌ No `team_id` → cannot assign workers to specific teams
- ⚠️ Separate from `provider_members` → two sources of "team members"

---

### 1.2 Supporting Tables

#### `providers`
- **Key Fields:** `user_id` (owner), location fields (province, city, barangay), `service_radius` (legacy), `max_service_radius`, `daily_capacity` (global, nullable)
- **Gap:** `daily_capacity` is global, not per-location

#### `booking_audits`
- **Purpose:** Audit trail for all booking changes
- **Columns:** `id`, `booking_id`, `action` (insert/update/delete), `actor_id`, `payload` (JSONB), `created_at`
- **Retention:** No TTL, grows indefinitely

#### `expenses`
- **Purpose:** Expense tracking per booking
- **Columns:** `id`, `provider_id`, `booking_id` (nullable), `created_by`, `amount`, `category`, `description`, `expense_date`, `receipt_url`, `notes`, `tags`

---

### 1.3 Enums

```sql
-- Role hierarchy: owner > admin > manager > staff > viewer
CREATE TYPE provider_role AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');

-- Member status
CREATE TYPE provider_member_status AS ENUM ('pending', 'active', 'suspended');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Booking source (immutable)
CREATE TYPE booking_source AS ENUM ('auto', 'manual');

-- Invitation method
CREATE TYPE invitation_method AS ENUM ('email_invite', 'admin_created', 'onboarding');

-- Worker status
CREATE TYPE worker_status AS ENUM ('active', 'inactive');

-- Expense category
CREATE TYPE expense_category AS ENUM ('ingredients', 'labor', 'transportation', 'equipment', 'utilities', 'marketing', 'other');
```

---

### 1.4 Key Functions/RPCs

#### `is_provider_member(provider_id uuid, user_id uuid, min_role provider_role)`
- **Purpose:** Check if user has at least `min_role` in provider
- **Used In:** RLS policies for role-based access
- **Logic:** Compares role hierarchy (owner > admin > manager > staff > viewer)

#### `get_user_capabilities(provider_id uuid, user_id uuid)`
- **Purpose:** Returns JSON object with user's capabilities (canViewAllBookings, canEditBookings, canInviteMembers, etc.)
- **Used In:** API routes for authorization

#### `calculate_total_price()`
- **Purpose:** Trigger function to auto-calculate `total_price` from `base_price`
- **Logic:** Currently just copies `base_price`, placeholder for future tax/fee logic

#### `audit_booking_changes()`
- **Purpose:** Trigger function to log all booking changes to `booking_audits`
- **Logic:** Captures OLD/NEW row data as JSONB payload

---

## 2. RLS Matrix

| Table | Role | SELECT | INSERT | UPDATE | DELETE | Filter Expression |
|-------|------|--------|--------|--------|--------|-------------------|
| **bookings** | Staff | ✅ | ❌ | ✅ | ❌ | `assigned_to = auth.uid()` ⚠️ |
| **bookings** | Manager+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'manager')` |
| **bookings** | Customer | ✅ | ❌ | ❌ | ❌ | `customer_id = auth.uid()` |
| **service_locations** | Staff+ | ✅ | ❌ | ❌ | ❌ | Active member of provider |
| **service_locations** | Manager+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'manager')` |
| **provider_members** | Self | ✅ | ❌ | ❌ | ❌ | `user_id = auth.uid()` |
| **provider_members** | Admin+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'admin')` |
| **shifts** | Staff+ | ✅ | ❌ | ❌ | ❌ | Member of booking's provider |
| **shifts** | Manager+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'manager')` |
| **worker_profiles** | Staff+ | ✅ | ❌ | ❌ | ❌ | Active member of provider |
| **worker_profiles** | Manager+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'manager')` |
| **expenses** | Staff+ | ✅ | ❌ | ❌ | ❌ | Active member of provider |
| **expenses** | Manager+ | ✅ | ✅ | ✅ | ✅ | `is_provider_member(provider_id, auth.uid(), 'manager')` |

**Key Observations:**
- ⚠️ **Staff role RLS for bookings is hardcoded to `assigned_to = auth.uid()`** → Must be rewritten for team-based access
- ✅ Manager+ roles have full CRUD on most tables
- ✅ Customers have read-only access to their own bookings
- ⚠️ No RLS policies for hypothetical `teams` table yet

---

## 3. API Map

### 3.1 Booking Routes

#### `GET /api/providers/[providerId]/bookings`
- **Auth:** Requires active provider membership
- **Input:** Query params: `search`, `status`, `source`, `assigned_to_me`, `page`, `page_size`, `sort_by`, `sort_order`
- **Logic:**
  ```typescript
  if (!membership.capabilities.canViewAllBookings) {
    // Staff role - only see assigned bookings
    query = query.eq('assigned_to', membership.userId); // ⚠️ Individual assignment
  }
  if (assignedToMe) {
    query = query.eq('assigned_to', membership.userId); // ⚠️ Filter for all roles
  }
  ```
- **Output:** `{ success, data: Booking[], pagination, filters, userRole, canEditBookings }`
- **Side Effects:** None (read-only)
- **Evidence:** `app/api/providers/[providerId]/bookings/route.ts:L45-48, L60-62`

#### `GET /api/providers/[providerId]/bookings/[bookingId]`
- **Auth:** Requires membership, staff can only view assigned bookings
- **Input:** Path params: `providerId`, `bookingId`
- **Logic:**
  ```typescript
  if (!membership.capabilities.canViewAllBookings) {
    if (booking.assigned_to !== membership.userId) {
      throw APIErrors.FORBIDDEN(); // ⚠️ Individual assignment check
    }
  }
  ```
- **Output:** Enriched booking with assigned team member info, shift aggregates, provider constraints
- **Side Effects:** None (read-only)
- **Evidence:** `app/api/providers/[providerId]/bookings/[bookingId]/route.ts`

---

### 3.2 Team Routes

#### `GET /api/providers/[providerId]/members`
- **Auth:** Requires active provider membership
- **Input:** Path param: `providerId`
- **Logic:** Fetches all team members with user metadata (full_name, email, avatar_url)
- **Output:** `TeamMemberWithUser[]`
- **Side Effects:** None (read-only)
- **Evidence:** `app/api/providers/[providerId]/members/route.ts`

#### `POST /api/providers/[providerId]/team/admin-create`
- **Auth:** Requires admin or owner role
- **Input:** `{ email, full_name, role }`
- **Logic:**
  1. Creates user account via Supabase Admin API
  2. Generates temporary password
  3. Creates provider_member record with `invitation_method = 'admin_created'`
  4. Sends welcome email with password setup link
- **Output:** `{ success, data: { user, member } }`
- **Side Effects:** Creates auth.users record, sends email
- **Evidence:** `app/api/providers/[providerId]/team/admin-create/route.ts`

---

### 3.3 Service Location Actions

#### `saveServiceLocations(providerId, locations[])`
- **Type:** Server Action (Next.js)
- **Auth:** Requires manager+ role (enforced via RLS)
- **Input:** `providerId`, array of service locations (with `id` for updates, without for creates)
- **Logic:**
  1. Deletes removed locations
  2. Updates existing locations
  3. Inserts new locations
  4. Validates `is_primary` constraint
- **Output:** `{ success, data: ServiceLocation[] }`
- **Side Effects:** CRUD on `service_locations` table
- **Evidence:** `app/(provider)/dashboard/profile/actions/service-locations.ts`

---

## 4. Client Map

### 4.1 Query Keys Pattern

**Generic Pattern** (`hooks/use-supabase-query.ts`):
```typescript
export const queryKeys = {
  table: (tableName: TableName) => [tableName] as const,
  tableItem: (tableName: TableName, id: string) => [tableName, id] as const,
}
```

**Bookings** (`app/(provider)/dashboard/bookings/hooks/use-bookings.ts`):
```typescript
export const bookingsKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingsKeys.all, 'list'] as const,
  list: (providerId: string | undefined, filters: BookingsFilters) =>
    [...bookingsKeys.lists(), providerId, filters] as const,
  detail: (bookingId: string) => [...bookingsKeys.all, 'detail', bookingId] as const,
};
```

**Team** (`app/(provider)/dashboard/team/hooks/use-team-members.ts`):
```typescript
export const teamKeys = {
  all: ["team"] as const,
  members: (providerId: string) => ["team", "members", providerId] as const,
  invitations: (providerId: string) => ["team", "invitations", providerId] as const,
};
```

---

### 4.2 Cache Configuration

| Hook | staleTime | gcTime | refetchOnWindowFocus | refetchOnMount |
|------|-----------|--------|----------------------|----------------|
| `useBookings` | 30s | 5min | false | false |
| `useTeamMembers` | 10s | default | true | true |
| `useDashboardAnalytics` | 2min | 10min | false | false |
| `useSupabaseQuery` (generic) | 30s | 5min | false | false |
| Global defaults | 10min | 30min | false | false |

**Evidence:** `lib/providers/query-provider.tsx:L13-18`, `hooks/use-supabase-query.ts:L84-86`

---

### 4.3 Key Components

#### `BookingsPage` (`app/(provider)/dashboard/bookings/page.tsx`)
- **State:** nuqs for URL state (`search`, `status`, `source`, `assigned_to_me`)
- **Queries:** `useCurrentMembership()`, `useBookings(providerId, filters)`
- **Filters:** Search input, status combobox, source combobox, "Assigned to me" toggle button
- **Assignment Logic:**
  ```typescript
  {membership?.capabilities.canViewAllBookings
    ? "Manage all catering bookings and assignments"
    : "View your assigned bookings"} // ⚠️ Individual assignment messaging
  ```
- **Evidence:** Lines 25-30 (nuqs filters), 111-114 (role-based messaging), 163-170 (assigned_to_me toggle)

#### `BookingsTable` (`app/(provider)/dashboard/bookings/components/bookings-table.tsx`)
- **Features:** Expandable rows for shifts, drag-and-drop reordering (if canEdit)
- **Expanded Row:** Shows `ShiftList` component with team assignments
- **Assignment Dialog:** `AssignTeammateDialog` for adding shifts
- **Evidence:** Lines 170-186 (DataTable with expandable rows), 189-196 (AssignTeammateDialog)

#### `TeamPage` (`app/(provider)/dashboard/team/page.tsx`)
- **State:** nuqs for pagination (`page`, `page_size`), role filter, status filter
- **Queries:** `useCurrentMembership()`, `useTeamMembers(providerId)`
- **Mutations:** `useInviteMember`, `useAddStaff`, `useUpdateMemberStatus`, `useRemoveMember`, `useUpdateMemberRole`
- **Modals:** `InviteMemberModal`, `AddStaffModal`, `EditRoleDrawer`
- **Evidence:** Lines 52-60 (queries and mutations), 327-350 (modals)

---

## 5. Assignment Flow Diagrams

### 5.1 Current Flow (Individual Assignment)

```
Customer creates booking
  ↓
Booking created with status='pending', assigned_to=NULL
  ↓
Manager/Admin views all bookings
  ↓
Manager assigns booking to Staff member (sets assigned_to=user_id)
  ↓
RLS policy filters: Staff sees only WHERE assigned_to = auth.uid()
  ↓
Staff views "Assigned to me" bookings
  ↓
Staff adds shifts (individual workers) to booking
  ↓
Booking progresses: confirmed → in_progress → completed
```

**Bottleneck:** One `assigned_to` user per booking → Cannot handle concurrent events in different areas

---

### 5.2 Target Flow (Location/Team-Based)

```
Customer creates booking with venue_address
  ↓
System auto-routes to nearest service_location (or manual selection)
  ↓
Booking created with service_location_id, team_id (auto-assigned or manual)
  ↓
RLS policy filters: Team members see WHERE team_id IN (SELECT team_id FROM provider_members WHERE user_id = auth.uid())
  ↓
All team members see bookings for their team(s)
  ↓
Team lead/manager assigns shifts to specific team members
  ↓
Multiple bookings can be handled concurrently by different teams
```

**Enabler:** `service_location_id` + `team_id` in bookings → Supports concurrent events per area

---

## 6. Evidence Log

### Database Schema
- **Tables:** `supabase/migrations/*.sql` (20+ migration files)
- **Enums:** Queried via `SELECT * FROM pg_type WHERE typtype = 'e'`
- **Functions:** Queried via `SELECT * FROM pg_proc WHERE pronamespace = 'public'::regnamespace`
- **Indexes:** Queried via `SELECT * FROM pg_indexes WHERE schemaname = 'public'`
- **RLS Policies:** Queried via `SELECT * FROM pg_policies WHERE schemaname = 'public'`
- **Triggers:** Queried via `SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public'`

### API Routes
- `app/api/providers/[providerId]/bookings/route.ts` (Lines 45-48: Staff filtering, 60-62: assigned_to_me filter)
- `app/api/providers/[providerId]/bookings/[bookingId]/route.ts` (Individual assignment check)
- `app/api/providers/[providerId]/members/route.ts` (Team member list)
- `app/api/providers/[providerId]/team/admin-create/route.ts` (Admin-created accounts)

### Client Code
- `app/(provider)/dashboard/bookings/page.tsx` (Lines 25-30: nuqs filters, 111-114: role messaging, 163-170: assigned_to_me toggle)
- `app/(provider)/dashboard/bookings/components/bookings-table.tsx` (Lines 170-186: Expandable rows, 189-196: AssignTeammateDialog)
- `app/(provider)/dashboard/bookings/hooks/use-bookings.ts` (Query keys, filters, pagination)
- `app/(provider)/dashboard/team/page.tsx` (Lines 52-60: Team queries, 327-350: Modals)
- `hooks/use-supabase-query.ts` (Lines 84-86: Cache config)
- `lib/providers/query-provider.tsx` (Lines 13-18: Global query defaults)

### Performance
- `types/query.types.ts` (Lines 219-233: QueryMetrics, QueryPerformanceOptions)
- `lib/middleware/rate-limit.ts` (In-memory sliding window rate limiter)
- `app/(provider)/dashboard/actions.ts` (Lines 247-252: Parallel analytics fetching)

---

## 7. Assumptions & Fallbacks

### Assumptions
1. **Single Provider per User:** Users belong to one provider at a time (enforced via `unique_provider_user` constraint)
2. **Role Hierarchy:** owner > admin > manager > staff > viewer (enforced via `is_provider_member` function)
3. **Immutable Booking Source:** `source` field cannot be changed after creation (enforced via trigger)
4. **One Primary Location:** Only one `is_primary` service location per provider (enforced via trigger)
5. **Staff See Only Assigned:** Staff role can only see bookings where `assigned_to = auth.uid()` (enforced via RLS)

### Fallbacks
1. **If service_locations table is empty:** Fall back to provider's legacy location fields (province, city, barangay)
2. **If assigned_to is NULL:** Booking is unassigned, visible to all managers/admins
3. **If team_id is NULL (future):** Fall back to individual assignment mode
4. **If RLS policy fails:** Deny access (fail-closed security model)
5. **If rate limit exceeded:** Return 429 with `Retry-After` header

---

## 8. Machine-Readable JSON

See `AUDIT_DATA.json` for full machine-readable output.

---

**End of Technical Audit**

