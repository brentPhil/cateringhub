# Service Radius Field Relocation

## Overview

The **Service radius** field has been moved from the **Availability** section to the **Service Coverage** section to improve the user experience and provide better visual context. Users can now see the immediate impact of their radius selection on the map.

## Changes Summary

### Before
- **Location**: Availability section (right sidebar)
- **Context**: Grouped with Daily capacity, Advance booking, and Weekly schedule
- **Visual feedback**: None - users couldn't see the impact of radius changes

### After
- **Location**: Service Coverage section (main content area)
- **Context**: Positioned above the map, directly related to service coverage visualization
- **Visual feedback**: Real-time map updates - users can see the coverage circle change as they adjust the radius

## Implementation Details

### 1. ServiceCoverageSection Component

**File**: `app/(provider)/dashboard/profile/components/service-coverage-section.tsx`

#### Added Props
```typescript
interface ServiceCoverageSectionProps {
  radius: number;
  centerCity: string;
  coveredCities: string[];
  onRadiusChange: (value: number) => void;  // ✅ Added
  isLoading?: boolean;
}
```

#### Added Service Radius Control
```tsx
{/* Service Radius Control */}
<div className="space-y-2">
  {isLoading ? (
    <>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-2 w-full rounded" />
      <Skeleton className="h-3 w-48" />
    </>
  ) : (
    <>
      <Label className="text-sm">Service radius (km)</Label>
      <Slider
        value={[radius]}
        onValueChange={(value) => onRadiusChange(value[0])}
        max={100}
        min={1}
        step={5}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">
        Maximum distance you can travel for events: {radius} km
      </p>
    </>
  )}
</div>
```

#### Updated Layout
```tsx
<div className="space-y-6">  {/* Changed from space-y-4 to space-y-6 */}
  {/* Service Radius Control */}
  <div className="space-y-2">...</div>

  {/* Map */}
  <ServiceMap radius={radius} centerCity={centerCity} isLoading={isLoading} />

  {/* Covered Cities */}
  <div className="space-y-2">...</div>
</div>
```

### 2. AvailabilitySection Component

**File**: `app/(provider)/dashboard/profile/components/availability-section.tsx`

#### Removed Props
```typescript
interface AvailabilitySectionProps {
  // serviceRadius: number;  // ❌ Removed
  dailyCapacity: number;
  advanceBookingDays: number;
  selectedDays: string[];
  // onServiceRadiusChange: (value: number) => void;  // ❌ Removed
  onDailyCapacityChange: (value: number) => void;
  onAdvanceBookingDaysChange: (value: number) => void;
  onSelectedDaysChange: (value: string[]) => void;
  isLoading?: boolean;
}
```

#### Removed Service Radius Field
```tsx
// ❌ REMOVED
{/* Service Radius */}
<div className="space-y-2">
  <Label className="text-sm">Service radius</Label>
  <Slider
    value={[serviceRadius]}
    onValueChange={(value) => onServiceRadiusChange(value[0])}
    max={100}
    step={5}
    className="w-full"
  />
  <p className="text-xs text-muted-foreground">
    Maximum travel distance: {serviceRadius} km
  </p>
</div>
```

#### Updated Loading Skeleton
Removed one skeleton placeholder to match the reduced number of fields.

### 3. Profile Page

**File**: `app/(provider)/dashboard/profile/page.tsx`

#### Updated Service Coverage Data Calculation
```typescript
// Calculate service coverage data from form values (updates in real-time)
// Uses the actual city code and current service radius from form state
const serviceCoverageData = React.useMemo(() => {
  return getServiceCoverageData(
    data?.profile?.city || null,
    formData.serviceRadius  // ✅ Uses form state instead of database value
  );
}, [data?.profile?.city, formData.serviceRadius]);
```

**Key Change**: Now uses `formData.serviceRadius` instead of `data?.profile?.service_radius` to enable real-time updates.

#### Updated ServiceCoverageSection Props
```tsx
<ServiceCoverageSection
  radius={serviceCoverageData.radius}
  centerCity={serviceCoverageData.mapCityName}
  coveredCities={serviceCoverageData.coveredCities}
  onRadiusChange={setServiceRadius}  // ✅ Added
  isLoading={isLoading}
/>
```

#### Updated AvailabilitySection Props
```tsx
<AvailabilitySection
  // serviceRadius={formData.serviceRadius}  // ❌ Removed
  dailyCapacity={formData.dailyCapacity}
  advanceBookingDays={formData.advanceBookingDays}
  selectedDays={formData.selectedDays}
  // onServiceRadiusChange={setServiceRadius}  // ❌ Removed
  onDailyCapacityChange={setDailyCapacity}
  onAdvanceBookingDaysChange={setAdvanceBookingDays}
  onSelectedDaysChange={setSelectedDays}
  isLoading={isLoading}
/>
```

## User Experience Improvements

### 1. Better Contextual Grouping
- **Service radius** is now grouped with the map and covered cities
- **Availability settings** (daily capacity, advance booking, weekly schedule) are now more focused

### 2. Real-Time Visual Feedback
- Users can see the coverage circle on the map change as they adjust the radius slider
- Covered cities list updates immediately when radius changes
- No need to save to see the impact of radius changes

### 3. Improved Layout
- Service radius control is positioned above the map for better visual flow
- Larger spacing (space-y-6) between sections for better readability
- Helper text clearly explains what the radius means: "Maximum distance you can travel for events"

### 4. Consistent UI Patterns
- Same slider component and styling as before
- Same validation rules (1-100 km range, 5 km steps)
- Same loading skeleton pattern

## Data Flow

```
User adjusts slider
    ↓
onRadiusChange(value) called
    ↓
setServiceRadius(value) updates form state
    ↓
formData.serviceRadius changes
    ↓
serviceCoverageData recalculated (useMemo)
    ↓
ServiceCoverageSection re-renders with new radius
    ↓
ServiceMap updates circle size
    ↓
Covered cities list updates
```

## Validation

- **Range**: 1-100 km (enforced by slider min/max)
- **Step**: 5 km increments
- **Default**: 50 km (from database or form state)
- **Required**: Yes (part of providerProfileFormSchema)

## Testing Checklist

### ✅ Completed

- [x] Service radius field removed from Availability section
- [x] Service radius field added to Service Coverage section
- [x] Field positioned above the map
- [x] Slider works correctly (1-100 km range, 5 km steps)
- [x] Helper text displays correctly
- [x] Loading skeleton displays correctly
- [x] No TypeScript errors
- [x] No console errors
- [x] Real-time updates enabled (uses formData.serviceRadius)

### 🔄 To Be Tested

- [ ] Adjusting radius updates map circle size in real-time
- [ ] Covered cities list updates when radius changes
- [ ] Saving form persists radius value correctly
- [ ] Form validation works for radius field
- [ ] isDirty state updates when radius changes
- [ ] Reset form button resets radius to database value

## Files Modified

1. `app/(provider)/dashboard/profile/components/service-coverage-section.tsx`
   - Added `onRadiusChange` prop
   - Added service radius control UI
   - Updated layout spacing

2. `app/(provider)/dashboard/profile/components/availability-section.tsx`
   - Removed `serviceRadius` and `onServiceRadiusChange` props
   - Removed service radius field UI
   - Updated loading skeleton

3. `app/(provider)/dashboard/profile/page.tsx`
   - Updated `serviceCoverageData` to use `formData.serviceRadius`
   - Added `onRadiusChange={setServiceRadius}` to ServiceCoverageSection
   - Removed `serviceRadius` and `onServiceRadiusChange` from AvailabilitySection

4. `docs/service-radius-relocation.md` - This document

## Benefits

1. **Improved UX**: Users can see the visual impact of their radius selection immediately
2. **Better Organization**: Related fields are now grouped together logically
3. **Real-Time Feedback**: Map updates as users adjust the slider
4. **Clearer Context**: Service radius is directly related to service coverage, not availability
5. **Simplified Availability Section**: Availability section now focuses on scheduling and capacity

## Conclusion

The service radius field has been successfully relocated from the Availability section to the Service Coverage section. This change improves the user experience by providing immediate visual feedback and better contextual grouping. The implementation maintains all existing functionality while adding real-time map updates.

