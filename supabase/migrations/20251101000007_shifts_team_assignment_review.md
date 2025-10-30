# Shifts Table Team Assignment Review

**Migration:** 20251101000007_shifts_team_assignment_review.md  
**Date:** November 1, 2025  
**Task:** Database & Schema Design - Review shift assignments  
**Status:** ✅ DECISION DOCUMENTED

---

## Executive Summary

**DECISION: DO NOT add team_id to shifts table at this time.**

The shifts table should continue to track **individual** staff member assignments to bookings. Team-based assignment happens at the **booking level** (via `bookings.team_id`), while shift-level assignments remain granular and individual.

---

## Current Shifts Table Structure

The shifts table currently tracks:
- **Individual assignments**: Each shift links one user to one booking
- **Attendance tracking**: Scheduled vs actual check-in/check-out times
- **Role specification**: What role the person performs (e.g., "Server", "Chef")
- **Status tracking**: scheduled → checked_in → checked_out → cancelled

### Current Schema
```sql
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  worker_profile_id UUID REFERENCES worker_profiles(id),  -- Added later
  role TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Analysis: Should We Add team_id to Shifts?

### Option A: Add team_id to Shifts ❌ NOT RECOMMENDED

**Pros:**
- Could support "assign entire team to a shift" in one operation
- Could track which team a shift belongs to for reporting

**Cons:**
- **Redundant**: Team is already tracked at booking level (`bookings.team_id`)
- **Denormalization**: Creates data duplication and potential inconsistency
- **Complexity**: Shifts can be derived from booking's team via join
- **Maintenance burden**: Need to keep shift.team_id in sync with booking.team_id
- **Unclear semantics**: What does it mean if shift.team_id ≠ booking.team_id?
- **Not aligned with use case**: Shifts are inherently individual (attendance tracking)

### Option B: Keep Shifts Individual ✅ RECOMMENDED

**Pros:**
- **Clear separation of concerns**: 
  - Bookings → Team assignment (which team handles this event?)
  - Shifts → Individual assignment (which person works this event?)
- **No redundancy**: Team info lives in one place (bookings table)
- **Simpler queries**: Join shifts → bookings → teams when needed
- **Flexible**: Supports edge cases like cross-team collaboration
- **Aligned with domain**: Attendance is tracked per person, not per team

**Cons:**
- Requires join to get team info from shifts (minimal performance impact)

---

## Recommended Data Model

### Hierarchy of Assignment
```
Provider
  └─ Service Location (where the kitchen/depot is)
      └─ Team (group of staff at that location)
          └─ Provider Members (individual staff assigned to team)
              └─ Shifts (individual assignments to specific bookings)
```

### Assignment Flow
1. **Booking created** → Assigned to `service_location_id` and `team_id`
2. **Team members identified** → Query `provider_members WHERE team_id = booking.team_id`
3. **Shifts created** → Individual shifts created for each team member needed
4. **Attendance tracked** → Each shift records individual check-in/check-out

### Example Queries

**Get all shifts for a booking's team:**
```sql
SELECT 
  s.id,
  s.user_id,
  s.role,
  s.status,
  pm.team_id,
  t.name as team_name
FROM shifts s
JOIN bookings b ON b.id = s.booking_id
JOIN provider_members pm ON pm.user_id = s.user_id AND pm.provider_id = b.provider_id
LEFT JOIN teams t ON t.id = pm.team_id
WHERE s.booking_id = 'booking-uuid';
```

**Get all shifts for a team on a specific date:**
```sql
SELECT 
  s.id,
  s.user_id,
  s.role,
  s.status,
  b.event_date,
  b.id as booking_id
FROM shifts s
JOIN bookings b ON b.id = s.booking_id
WHERE b.team_id = 'team-uuid'
  AND b.event_date = '2025-11-15'
ORDER BY s.scheduled_start;
```

**Check if a team member is available for a new shift:**
```sql
-- Find conflicting shifts for a user on a specific date/time
SELECT COUNT(*) as conflicts
FROM shifts s
JOIN bookings b ON b.id = s.booking_id
WHERE s.user_id = 'user-uuid'
  AND s.status NOT IN ('cancelled')
  AND b.event_date = '2025-11-15'
  AND s.scheduled_start < 'end-time'
  AND s.scheduled_end > 'start-time';
```

---

## Alternative Approaches Considered

### 1. Junction Table: team_shifts
Create a separate table to assign entire teams to bookings:
```sql
CREATE TABLE team_shifts (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  team_id UUID REFERENCES teams(id),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ
);
```
**Verdict:** ❌ Unnecessary complexity. The booking already has team_id.

### 2. Composite Key: (booking_id, team_id, user_id)
Make shifts table aware of teams via composite key.

**Verdict:** ❌ Over-engineering. Team is already on booking.

### 3. Materialized View: team_shift_summary
Create a view that aggregates shifts by team.

**Verdict:** ✅ Good for reporting, but doesn't require schema change.

---

## Implementation Recommendations

### 1. Keep Current Schema ✅
No changes needed to shifts table structure.

### 2. Update RLS Policies (Future Enhancement)
Consider updating shift RLS policies to be team-aware:
```sql
-- Allow team members to view shifts for their team's bookings
CREATE POLICY "Team members can view team shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (
  public.is_team_member_for_booking(booking_id, auth.uid())
);
```

### 3. Create Helper Views (Optional)
Create views for common team-based shift queries:
```sql
CREATE VIEW team_shift_roster AS
SELECT 
  s.id as shift_id,
  s.booking_id,
  s.user_id,
  s.role,
  s.status,
  b.team_id,
  b.service_location_id,
  b.event_date,
  t.name as team_name,
  sl.city as location_city
FROM shifts s
JOIN bookings b ON b.id = s.booking_id
LEFT JOIN teams t ON t.id = b.team_id
LEFT JOIN service_locations sl ON sl.id = b.service_location_id;
```

### 4. Add Indexes for Team-Based Queries (Optional)
If team-based shift queries become common, add composite indexes:
```sql
-- Index for querying shifts by booking's team (via join)
-- This is already covered by existing idx_shifts_booking_id
-- No additional index needed
```

---

## Migration Impact

### Breaking Changes
**None.** This is a documentation-only decision.

### Required Updates
**None.** No schema changes required.

### Recommended Follow-ups
1. ✅ Update RLS policies to use team-based helper functions (Phase 2: RLS Policies & Security)
2. ✅ Create team-aware shift queries in application code
3. ✅ Document team-based shift assignment workflow in API docs
4. ⏳ Consider creating helper views for common team shift queries (Future Enhancement)

---

## Conclusion

The shifts table should **NOT** have a team_id column. Team assignment is handled at the booking level, and shifts remain individual assignments for attendance tracking. This maintains clear separation of concerns, avoids data duplication, and aligns with the domain model where attendance is tracked per person, not per team.

**Status:** ✅ Decision finalized - No schema changes needed for shifts table.

---

## References

- Original shifts table migration: `20251021000002_create_shifts_table.sql`
- Worker profiles support: `20251021000006_create_worker_profiles_table.sql`
- Team-based assignment model: `20251101000002_create_teams_table.sql`
- Booking team linkage: `20251101000004_add_team_to_bookings.sql`
- Team helper functions: `20251101000006_create_team_helper_functions.sql`

