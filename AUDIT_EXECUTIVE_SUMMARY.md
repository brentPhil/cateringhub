# CateringHub Infrastructure Audit - Executive Summary

**Date:** 2025-10-28  
**Auditor:** Senior Product+Platform Auditor  
**Scope:** Bookings & Assignment Infrastructure for Location/Team-Based Dispatch Redesign

---

## 1. Current State Snapshot

### Database Layer
- **Tables:** 15 core tables including `bookings`, `providers`, `provider_members`, `service_locations`, `shifts`, `worker_profiles`, `expenses`, `booking_audits`
- **Assignment Model:** Individual-based via `bookings.assigned_to` (UUID → auth.users)
- **Service Locations:** Multi-location support exists (`service_locations` table) but **not integrated** with booking assignment flow
- **Team Structure:** `provider_members` table with role hierarchy (owner > admin > supervisor > staff > viewer)
- **Crew Assignments:** `shifts` table supports multiple team members/workers per booking (partial team concept)
- **Indexes:** 47 indexes optimized for current individual assignment queries (`idx_bookings_assigned_to`, `idx_bookings_assigned_status`)
- **RLS Policies:** 52 policies enforcing role-based access; staff can only see bookings assigned to them individually

### API Layer
- **Route Handlers:** Next.js App Router API routes with role-based filtering
- **Key Endpoints:**
  - `GET /api/providers/[providerId]/bookings` - Role-based filtering, staff see only `assigned_to = user_id`
  - `GET /api/providers/[providerId]/members` - Team member management
  - `POST /api/providers/[providerId]/team/admin-create` - Admin-created accounts
  - Server actions for service locations (CRUD)
- **Pagination:** Server-side with default 10 items/page, max 100
- **Filtering:** Search, status, source, `assigned_to_me` toggle

### Client Layer
- **State Management:** nuqs for URL state persistence, TanStack Query for server state
- **Query Caching:** 
  - Bookings: 30s staleTime, 5min gcTime
  - Team members: 10s staleTime, refetchOnWindowFocus enabled
  - Dashboard analytics: 2min staleTime, 10min gcTime
- **Components:** Generic DataTable with expandable rows for shifts, Combobox for filters
- **Assignment UI:** "Assigned to me" toggle filter, shift assignment dialog per booking

### Operations & Performance
- **Audit Trail:** `booking_audits` table logs all INSERT/UPDATE/DELETE on bookings
- **Triggers:** Auto-calculate pricing, enforce single primary location, prevent source changes
- **Rate Limiting:** In-memory sliding window (production should use Redis/Upstash)
- **Analytics:** Parallel fetching of revenue, bookings, staff utilization, expenses, trends
- **Telemetry:** Supabase Analytics enabled (Postgres backend)

---

## 2. Top 5 Gaps vs. Real-World Catering Workflow

### Gap #1: No Service Location → Booking Link ⚠️ **CRITICAL**
**Current:** `bookings` table has no `service_location_id` foreign key  
**Impact:** Cannot assign bookings to specific service locations or teams tied to locations  
**Real-World Need:** Catering businesses operate from multiple kitchens/depots, each serving different geographic areas with dedicated teams  
**Evidence:** `service_locations` table exists but is orphaned from booking flow

### Gap #2: No Team Entity or Location → Team Mapping ⚠️ **CRITICAL**
**Current:** `provider_members` is a flat list of users with roles, no team grouping  
**Impact:** Cannot organize staff into location-based teams (e.g., "North Team", "South Team")  
**Real-World Need:** Each service location needs a dedicated team to handle concurrent events in that area  
**Evidence:** No `teams` table, no `team_id` in `provider_members` or `bookings`

### Gap #3: Individual Assignment Prevents Concurrent Events ⚠️ **CRITICAL**
**Current:** `bookings.assigned_to` is a single UUID, RLS policies filter by `assigned_to = auth.uid()` for staff  
**Impact:** One staff member can only be assigned to one booking at a time; no team-level visibility  
**Real-World Need:** Multiple events can happen simultaneously in different areas, each handled by a different team  
**Evidence:** 
- `app/api/providers/[providerId]/bookings/route.ts:L45-48` - Staff role filters `assigned_to = userId`
- RLS policy: `is_provider_member(..., 'staff') AND assigned_to = auth.uid()`

### Gap #4: Indexes Optimized for Wrong Query Patterns 🔶 **HIGH**
**Current:** Indexes like `idx_bookings_assigned_to`, `idx_bookings_assigned_status` assume individual assignment queries  
**Impact:** Future location/team-based queries will be slow without new indexes  
**Real-World Need:** Queries like "all bookings for North Team" or "bookings in service_location X"  
**Evidence:** No indexes on hypothetical `service_location_id` or `team_id` columns

### Gap #5: No Capacity Planning per Location 🔶 **HIGH**
**Current:** `providers.daily_capacity` is a single global number (nullable)  
**Impact:** Cannot enforce different capacity limits per service location  
**Real-World Need:** Each kitchen/depot has its own capacity (e.g., North location: 5 events/day, South: 3 events/day)  
**Evidence:** `service_locations` table has no `daily_capacity` or `max_concurrent_events` column

---

## 3. High-Risk Items & Quick Wins

### High-Risk Items 🚨

1. **RLS Policy Rewrite Required**
   - **Risk:** All staff-level RLS policies assume `assigned_to = auth.uid()`
   - **Impact:** Changing to team-based access requires rewriting 10+ policies
   - **Mitigation:** Create new helper functions like `is_team_member_for_booking(booking_id, user_id)` before migration

2. **Data Migration for Existing Bookings**
   - **Risk:** 1000s of existing bookings have `assigned_to` set; need to map to new team structure
   - **Impact:** Downtime or dual-write complexity during migration
   - **Mitigation:** Phased rollout: add new columns, backfill, deprecate old columns

3. **Client Code Assumes Individual Assignment**
   - **Risk:** 15+ components/hooks filter by `assigned_to_me` or `currentUserId`
   - **Impact:** UI will break if backend changes without coordinated frontend updates
   - **Mitigation:** Feature flag for team-based mode, gradual rollout

### Quick Wins ✅

1. **Add `service_location_id` to Bookings (Schema Only)**
   - **Effort:** 1 migration, nullable column, no RLS changes yet
   - **Value:** Enables future queries, no breaking changes
   - **Timeline:** 1 day

2. **Create `teams` Table (Additive)**
   - **Effort:** 1 migration with `teams(id, provider_id, service_location_id, name, daily_capacity)`
   - **Value:** Foundation for team-based assignment
   - **Timeline:** 1 day

3. **Add Composite Index for Location-Based Queries**
   - **Effort:** `CREATE INDEX idx_bookings_location_date_status ON bookings(service_location_id, event_date DESC, status)` (nullable-safe)
   - **Value:** Prepares for future query patterns
   - **Timeline:** 1 hour

4. **Extend Service Locations with Capacity Fields**
   - **Effort:** Add `daily_capacity`, `max_concurrent_events` to `service_locations`
   - **Value:** Enables per-location capacity planning
   - **Timeline:** 1 day

---

## 4. Recommended Next Steps

### Phase 1: Foundation (Week 1-2)
1. ✅ Add `service_location_id` to `bookings` (nullable, indexed)
2. ✅ Create `teams` table with `service_location_id` FK
3. ✅ Add `team_id` to `provider_members` (nullable, indexed)
4. ✅ Extend `service_locations` with capacity fields
5. ✅ Create helper functions: `get_team_for_booking()`, `is_team_member_for_booking()`

### Phase 2: Dual-Write Mode (Week 3-4)
1. 🔄 Update booking creation API to optionally set `service_location_id` + `team_id`
2. 🔄 Backfill existing bookings: map `assigned_to` → infer team from user's primary team
3. 🔄 Add feature flag `ENABLE_TEAM_BASED_ASSIGNMENT`
4. 🔄 Create new RLS policies for team-based access (disabled by default)

### Phase 3: Migration (Week 5-6)
1. 🔄 Enable team-based RLS policies, disable individual assignment policies
2. 🔄 Update client components to use team filters instead of `assigned_to_me`
3. 🔄 Deprecate `bookings.assigned_to` (keep for audit trail, stop writing)
4. 🔄 Monitor performance, adjust indexes as needed

### Phase 4: Cleanup (Week 7+)
1. 🧹 Remove old RLS policies
2. 🧹 Remove `assigned_to_me` filters from UI
3. 🧹 Archive `assigned_to` column (or keep for historical queries)

---

## 5. Open Questions (Max 10)

1. **Team Assignment Logic:** Should bookings be auto-assigned to teams based on venue proximity to service location, or manual selection?
2. **Multi-Team Bookings:** Can a single booking span multiple teams (e.g., large event needs North + South teams)?
3. **Team Member Overlap:** Can a user belong to multiple teams? If yes, how to handle RLS visibility?
4. **Capacity Enforcement:** Should the system hard-block bookings exceeding location capacity, or just warn?
5. **Historical Data:** Should old bookings (pre-migration) remain visible to originally assigned individuals, or migrate to team visibility?
6. **Service Location Selection:** Who decides which service location handles a booking—customer, system auto-routing, or provider admin?
7. **Team Roles:** Do teams need their own role hierarchy (team lead, team member), or inherit from provider_members.role?
8. **Concurrent Event Limit:** Is `max_concurrent_events` per location a hard limit, or can it be overridden by admins?
9. **Shift Assignment:** Should shifts remain individual (current) or also support team-level assignments?
10. **Performance Target:** What is the acceptable P95 latency for "get all bookings for my team" query? (Current individual queries: ~50-100ms)

---

## 6. Summary

**Current System:** Well-architected for individual assignment with strong RLS, audit trails, and modern stack. However, fundamentally incompatible with location/team-based dispatch due to hardcoded `assigned_to` individual model.

**Migration Complexity:** Medium-High. Requires schema changes, RLS rewrites, client updates, and data backfill. Estimated 6-8 weeks for full migration with testing.

**Biggest Blocker:** RLS policies and client code deeply coupled to `assigned_to = auth.uid()` pattern. Changing this requires coordinated backend + frontend updates.

**Recommended Approach:** Phased migration with feature flags, dual-write mode, and gradual rollout to minimize risk.

---

**See `AUDIT_TECHNICAL_DETAILS.md` for full technical audit with evidence log and machine-readable JSON output.**
