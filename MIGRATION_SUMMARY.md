# Per-Location Service Radius Migration Summary

## ✅ Completed: Database Migrations

### Migration 1: `20250124000000_add_per_location_service_radius.sql`
**Status:** ✅ Applied successfully

**Changes made:**
1. **Added `max_service_radius` column to `catering_providers` table**
   - Type: `INTEGER NOT NULL DEFAULT 100`
   - Purpose: Sets the maximum allowed service radius for any location owned by this provider
   - Default: 100 km

2. **Added `service_radius` column to `service_locations` table**
   - Type: `INTEGER NOT NULL DEFAULT 50`
   - Purpose: Allows each location to have its own service radius
   - Default: 50 km

3. **Backfilled existing data**
   - Migrated existing global `service_radius` values from `catering_providers` to each location's `service_radius`
   - Verified: Existing locations now have `service_radius = 31` (matching the old global value)

4. **Created database constraint enforcement**
   - Function: `enforce_max_service_radius()`
   - Trigger: `trigger_enforce_max_service_radius`
   - Ensures: No location's `service_radius` can exceed its provider's `max_service_radius`
   - Tested: ✅ Constraint correctly prevents invalid updates

5. **Added validation constraints**
   - `check_service_radius_positive`: Ensures `service_radius > 0`
   - `check_max_service_radius_positive`: Ensures `max_service_radius > 0`

6. **Added performance index**
   - `idx_service_locations_service_radius` on `service_locations(service_radius)`

### Migration 2: `20250124000001_remove_global_service_radius.sql`
**Status:** ⏸️ Prepared but NOT applied yet

**Purpose:** Remove the old global `service_radius` column from `catering_providers`

**⚠️ IMPORTANT:** This migration should ONLY be applied AFTER:
1. All application code is updated to use `service_locations.service_radius`
2. All application code is updated to use `catering_providers.max_service_radius`
3. No code references `catering_providers.service_radius`
4. The new code has been deployed and tested in production

---

## 📋 Next Steps

### 1. Regenerate TypeScript Types
**Action required:** You need to regenerate Supabase types to include the new columns.

Run this command:
```bash
npx supabase gen types typescript --project-id ghfnyprmnluutpcacdjp > types/supabase.ts
```

**Expected new types:**
```typescript
// In types/supabase.ts
service_locations: {
  Row: {
    // ... existing fields
    service_radius: number  // NEW
  }
}

catering_providers: {
  Row: {
    // ... existing fields
    service_radius: number | null  // OLD - will be removed later
    max_service_radius: number     // NEW
  }
}
```

### 2. Code Implementation (After type generation)
Once you've regenerated the types, I will implement:

#### A. Update Interfaces and Types
- Add `serviceRadius: number` to `ServiceLocationFormData` interface
- Add `maxServiceRadius: number` to `ProfileFormState` interface
- Remove global `serviceRadius` from `ProfileFormState`
- Update validation schemas

#### B. Update Hooks
- `useServiceLocations`: Add `serviceRadius` field handling
- `useProfileFormState`: Add `maxServiceRadius`, remove global `serviceRadius`
- Update `convertToFormData` to include `serviceRadius`

#### C. Update UI Components
- `ServiceLocationsSection`: Add service radius input per location
- `ServiceCoverageSection`: 
  - Accept `locations` array with per-location radius
  - Add `activeLocationId` and `onActiveLocationChange` props
  - Show markers for all locations
  - Display coverage circle for active location only (with optional "Show all" toggle)
  - Update radius control to modify active location's radius

#### D. Update Map Behavior
- Display markers for all service locations
- Highlight primary location marker (different color/size)
- Make markers clickable to set active location
- Show coverage circle for active location
- Optional: "Show all coverage areas" toggle for multiple circles

#### E. Update Server Actions
- `saveServiceLocations`: Include `service_radius` when saving
- Update profile save to include `max_service_radius`

#### F. Update Validation
- Validate each location's `service_radius` ≤ provider's `max_service_radius`
- Add UI validation messages
- Update form-level validation

---

## 🗄️ Database Schema Changes

### New Columns

**`catering_providers.max_service_radius`**
- Type: `INTEGER NOT NULL DEFAULT 100`
- Constraint: `CHECK (max_service_radius > 0)`
- Purpose: Maximum allowed service radius for any location

**`service_locations.service_radius`**
- Type: `INTEGER NOT NULL DEFAULT 50`
- Constraint: `CHECK (service_radius > 0)`
- Trigger: Must be ≤ provider's `max_service_radius`
- Purpose: Service radius for this specific location

### Existing Column (to be removed later)

**`catering_providers.service_radius`**
- Status: Still exists (for backward compatibility)
- Will be removed: After code deployment via migration `20250124000001`

---

## 🧪 Verification Queries

### Check new columns exist
```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('service_locations', 'catering_providers')
  AND column_name IN ('service_radius', 'max_service_radius')
ORDER BY table_name, column_name;
```

### Check backfill worked
```sql
SELECT 
  sl.id,
  sl.service_radius as location_radius,
  cp.service_radius as old_global_radius,
  cp.max_service_radius
FROM service_locations sl
JOIN catering_providers cp ON sl.provider_id = cp.id;
```

### Test constraint enforcement
```sql
-- This should fail with error
UPDATE service_locations
SET service_radius = 999
WHERE id = (SELECT id FROM service_locations LIMIT 1);
```

---

## 📝 Migration Files Created

1. ✅ `supabase/migrations/20250124000000_add_per_location_service_radius.sql` - Applied
2. ⏸️ `supabase/migrations/20250124000001_remove_global_service_radius.sql` - Not applied yet

---

## ⚠️ Important Notes

1. **Type Generation Required**: You must regenerate TypeScript types before proceeding with code changes
2. **Backward Compatibility**: The old `service_radius` column is kept for now to allow safe rollback
3. **Database Constraint**: The trigger enforces max radius at the database level - invalid updates will fail
4. **Migration Order**: Do NOT apply migration `20250124000001` until after code deployment
5. **Testing**: Test the constraint enforcement in development before deploying to production

---

## 🎯 Ready for Next Phase

Once you've regenerated the types, let me know and I'll proceed with:
- Updating all TypeScript interfaces
- Refactoring hooks to support per-location radius
- Updating UI components
- Implementing interactive map with location markers
- Adding validation logic
- Updating server actions

The database is ready! 🚀

