# Province Field Implementation

## Overview

The provider profile form has been enhanced with a new **Province** field that implements cascading dropdowns for better address data collection. The flow is now: **Street Address → Province → City → Barangay → Postal Code**.

## Implementation Summary

### 1. Database Migration

**File**: `supabase/migrations/20250122000000_add_province_field.sql`

```sql
-- Add province column (stores PSGC province code like "0837")
ALTER TABLE public.catering_providers
ADD COLUMN IF NOT EXISTS province TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.catering_providers.province IS 'Province code from PSGC (Philippine Standard Geographic Code)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_catering_providers_province ON public.catering_providers(province);
```

**Status**: ⚠️ Migration file created but needs to be applied manually via Supabase dashboard or CLI

### 2. TypeScript Type Updates

#### ProviderProfile Interface

**File**: `app/(provider)/dashboard/profile/hooks/use-provider-profile.ts`

```typescript
export interface ProviderProfile {
  // ... other fields
  // Address fields
  email?: string;
  street_address?: string;
  province?: string;  // ✅ Added
  city?: string;
  barangay?: string;
  postal_code?: string;
  tagline?: string;
  // ... other fields
}
```

#### ProfileFormState Interface

**File**: `app/(provider)/dashboard/profile/hooks/use-profile-form-state.ts`

```typescript
export interface ProfileFormState {
  businessName: string;
  contactPersonName: string;
  mobileNumber: string;
  email: string;
  streetAddress: string;
  province: string;  // ✅ Added
  city: string;
  barangay: string;
  postalCode: string;
  tagline: string;
  description: string;
  // Availability fields
  profileVisible: boolean;
  serviceRadius: number;
  dailyCapacity: number;
  advanceBookingDays: number;
  selectedDays: string[];
}
```

### 3. Validation Schema Update

**File**: `lib/validations/index.ts`

```typescript
export const providerProfileFormSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  contactPersonName: z.string().min(2, 'Contact person name must be at least 2 characters'),
  mobileNumber: z.string()
    .min(1, 'Mobile number is required')
    .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Please enter a valid mobile number')
    .refine(val => {
      const cleaned = val.replace(/[\s\-\(\)\+]/g, '');
      return cleaned.length >= 10 && cleaned.length <= 15;
    }, 'Mobile number must be between 10-15 digits'),
  email: emailSchema.optional().or(z.literal('')),
  province: z.string().min(1, 'Province is required'),  // ✅ Added
  city: z.string().min(1, 'City is required'),
  barangay: z.string().min(1, 'Barangay is required'),
  // ... other fields
});
```

### 4. Form State Management

**File**: `app/(provider)/dashboard/profile/hooks/use-profile-form-state.ts`

#### Query State

```typescript
const [formState, setFormState] = useQueryStates({
  businessName: parseAsString,
  contactPersonName: parseAsString,
  mobileNumber: parseAsString,
  email: parseAsString,
  streetAddress: parseAsString,
  province: parseAsString,  // ✅ Added
  city: parseAsString,
  barangay: parseAsString,
  postalCode: parseAsString,
  tagline: parseAsString,
  description: parseAsString,
  // Availability fields
  profileVisible: parseAsBoolean,
  serviceRadius: parseAsInteger,
  dailyCapacity: parseAsInteger,
  advanceBookingDays: parseAsInteger,
  selectedDays: parseAsArrayOf(parseAsString),
});
```

#### Form Data Mapping

```typescript
const formData: ProfileFormState = useMemo(() => {
  const data = {
    businessName: formState.businessName ?? (initialProfile?.business_name || ""),
    contactPersonName: formState.contactPersonName ?? (initialProfile?.contact_person_name || ""),
    mobileNumber: formState.mobileNumber ?? (initialProfile?.mobile_number || ""),
    email: formState.email ?? (initialProfile?.email || ""),
    streetAddress: formState.streetAddress ?? (initialProfile?.street_address || ""),
    province: formState.province ?? (initialProfile?.province || ""),  // ✅ Added
    city: formState.city ?? (initialProfile?.city || ""),
    barangay: formState.barangay ?? (initialProfile?.barangay || ""),
    // ... other fields
  };
  // ...
}, [formState, initialProfile]);
```

#### isDirty Comparison

```typescript
const dirty =
  formData.businessName !== (initialProfile.business_name || "") ||
  formData.contactPersonName !== (initialProfile.contact_person_name || "") ||
  formData.mobileNumber !== (initialProfile.mobile_number || "") ||
  formData.email !== (initialProfile.email || "") ||
  formData.streetAddress !== (initialProfile.street_address || "") ||
  formData.province !== (initialProfile.province || "") ||  // ✅ Added
  formData.city !== (initialProfile.city || "") ||
  formData.barangay !== (initialProfile.barangay || "") ||
  // ... other fields
```

#### Reset Form

```typescript
const result = await setFormState({
  businessName: null,
  contactPersonName: null,
  mobileNumber: null,
  email: null,
  streetAddress: null,
  province: null,  // ✅ Added
  city: null,
  barangay: null,
  postalCode: null,
  tagline: null,
  description: null,
  // ... other fields
});
```

### 5. Philippine Locations Hooks

**File**: `lib/hooks/use-philippine-locations.ts`

#### New useProvinces Hook

```typescript
/**
 * Hook to get all provinces as Combobox options
 * Data is memoized for performance
 */
export function useProvinces() {
  const provinces = useMemo(() => {
    try {
      const allProvinces = getProvinces();
      const options: ComboboxOption[] = allProvinces
        .filter((province) => province && typeof province.prov_code === "string" && province.prov_code.length > 0)
        .map((province) => ({
          value: province.prov_code,
          label: String(province.name ?? "").trim(),
        }))
        .filter((opt) => opt.label.length > 0);
      return sortAlphabetically(options);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("useProvinces failed to build options", e);
      }
      return [] as ComboboxOption[];
    }
  }, []);

  return {
    provinces,
    isLoading: false,
    error: null,
  };
}
```

#### Updated useCities Hook

```typescript
/**
 * Hook to get cities and municipalities as Combobox options
 * Optionally filtered by province code
 * Data is memoized based on the province code
 * 
 * @param provinceCode - Optional province code to filter cities
 */
export function useCities(provinceCode?: string | null) {
  const cities = useMemo(() => {
    try {
      const allCities = provinceCode 
        ? getCitiesByProvince(provinceCode)
        : getCitiesAndMunicipalities();
      const options: ComboboxOption[] = allCities
        .filter((city) => city && typeof city.mun_code === "string" && city.mun_code.length > 0)
        .map((city) => ({
          value: city.mun_code,
          label: String(city.name ?? "").trim(),
        }))
        .filter((opt) => opt.label.length > 0);
      return sortAlphabetically(options);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("useCities failed to build options", e);
      }
      return [] as ComboboxOption[];
    }
  }, [provinceCode]);

  return {
    cities,
    isLoading: false,
    error: null,
  };
}
```

### 6. Profile Form UI

**File**: `app/(provider)/dashboard/profile/components/profile-form.tsx`

#### Component Updates

```typescript
export function ProfileForm({
  formData,
  setFormState,
  isLoading,
  errors = {},
}: BasicInformationSectionProps) {
  // Fetch provinces, cities, and barangays from PSGC data
  const { provinces, isLoading: provincesLoading } = useProvinces();
  const { cities, isLoading: citiesLoading } = useCities(formData.province);  // ✅ Filtered by province

  const {
    businessName,
    contactPersonName,
    mobileNumber,
    email,
    streetAddress,
    province,  // ✅ Added
    city,
    barangay,
    postalCode,
  } = formData;

  // Fetch barangays when city is selected (cascading)
  const { barangays, isLoading: barangaysLoading } = useBarangays(city);

  // Reset city and barangay when province changes
  React.useEffect(() => {
    if (province && city) {
      // Check if current city is valid for the selected province
      const isValidCity = cities.some((c) => c.value === city);
      if (!isValidCity) {
        setFormState({ city: "", barangay: "" });
      }
    }
  }, [province, city, cities, setFormState]);

  // Reset barangay when city changes
  React.useEffect(() => {
    if (city && barangay) {
      // Check if current barangay is valid for the selected city
      const isValidBarangay = barangays.some((b) => b.value === barangay);
      if (!isValidBarangay) {
        setFormState({ barangay: "" });
      }
    }
  }, [city, barangay, barangays, setFormState]);
  
  // ... rest of component
}
```

#### Province Field UI

```tsx
<Field>
  <FieldLabel htmlFor="province">
    Province <span className="text-destructive">*</span>
  </FieldLabel>
  <VirtualizedCombobox
    options={provinces}
    value={province || ""}
    onValueChange={(value) => setFormState({ province: value })}
    placeholder="Select province"
    searchPlaceholder="Search provinces..."
    emptyMessage={
      provincesLoading ? "Loading provinces..." : "No province found"
    }
    disabled={provincesLoading}
    className={errors.province ? "border-destructive" : ""}
  />
  {errors.province && <FieldError>{errors.province}</FieldError>}
</Field>
```

#### Updated City Field UI

```tsx
<Field>
  <FieldLabel htmlFor="city">
    City <span className="text-destructive">*</span>
  </FieldLabel>
  <VirtualizedCombobox
    options={cities}
    value={city || ""}
    onValueChange={(value) => setFormState({ city: value })}
    placeholder={province ? "Select city" : "Select province first"}
    searchPlaceholder="Search cities..."
    emptyMessage={
      citiesLoading
        ? "Loading cities..."
        : province
        ? "No city found"
        : "Please select a province first"
    }
    disabled={!province || citiesLoading}  // ✅ Disabled until province is selected
    className={errors.city ? "border-destructive" : ""}
  />
  {errors.city && <FieldError>{errors.city}</FieldError>}
</Field>
```

### 7. Save Action Update

**File**: `app/(provider)/dashboard/profile/actions.ts`

```typescript
const updateData = {
  business_name: validatedData.businessName,
  contact_person_name: validatedData.contactPersonName,
  mobile_number: validatedData.mobileNumber,
  description: validatedData.description,
  email: validatedData.email || null,
  province: validatedData.province,  // ✅ Added
  city: validatedData.city,
  barangay: validatedData.barangay,
  tagline: validatedData.tagline || null,
  // Availability fields (optional)
  is_visible: validatedData.profileVisible ?? undefined,
  service_radius: validatedData.serviceRadius ?? undefined,
  daily_capacity: validatedData.dailyCapacity ?? undefined,
  advance_booking_days: validatedData.advanceBookingDays ?? undefined,
  available_days: validatedData.selectedDays ?? undefined,
  updated_at: new Date().toISOString(),
};
```

## Cascading Dropdown Behavior

### Flow

1. **User selects Province** → City dropdown becomes enabled and shows only cities in that province
2. **User selects City** → Barangay dropdown becomes enabled and shows only barangays in that city
3. **User changes Province** → City and Barangay are reset to empty
4. **User changes City** → Barangay is reset to empty

### Implementation

- **Province → City**: `useCities(formData.province)` filters cities by province code
- **City → Barangay**: `useBarangays(city)` filters barangays by city code
- **Reset Logic**: `useEffect` hooks validate and reset dependent fields when parent changes

## Testing Status

### ✅ Completed

- [x] Province field appears in the correct position in the form
- [x] Province dropdown loads all Philippine provinces
- [x] TypeScript types updated for all interfaces
- [x] Validation schema includes province as required field
- [x] Form state management includes province
- [x] Save action includes province in database update
- [x] Cascading dropdown logic implemented
- [x] Reset logic for city and barangay when province changes

### ⚠️ Pending (Requires Database Migration)

- [ ] Database migration applied to production
- [ ] Province field persists to database correctly
- [ ] Province field loads from database on page load
- [ ] Map updates correctly when province/city is changed and saved
- [ ] Existing profiles without province handle gracefully

### 🔄 To Be Tested After Migration

- [ ] Selecting a province filters the city dropdown correctly
- [ ] Changing province resets city and barangay selections
- [ ] Form validation shows errors for missing province
- [ ] Saving the form persists province to the database
- [ ] Province appears in the marker popup on the map
- [ ] No console errors or TypeScript errors

## Next Steps

1. **Apply Database Migration**
   - Run migration via Supabase dashboard or CLI
   - Verify `province` column exists in `catering_providers` table

2. **Test Cascading Dropdowns**
   - Select a province and verify cities are filtered
   - Change province and verify city/barangay reset
   - Save form and verify province persists

3. **Update Service Map** (Future Enhancement)
   - Add province to marker popup
   - Use province capital as fallback if city not found
   - Group covered cities by province

4. **Handle Backward Compatibility**
   - Existing profiles may have `province = null`
   - Form should handle this gracefully
   - Consider migration script to populate province from city data

## Files Modified

1. `supabase/migrations/20250122000000_add_province_field.sql` - Database migration
2. `app/(provider)/dashboard/profile/hooks/use-provider-profile.ts` - Type definition
3. `app/(provider)/dashboard/profile/hooks/use-profile-form-state.ts` - Form state management
4. `lib/validations/index.ts` - Validation schema
5. `lib/hooks/use-philippine-locations.ts` - Province hook and updated cities hook
6. `app/(provider)/dashboard/profile/components/profile-form.tsx` - UI implementation
7. `app/(provider)/dashboard/profile/actions.ts` - Save action
8. `docs/service-map-database-integration.md` - Documentation update
9. `docs/province-field-implementation.md` - This document

## Conclusion

The province field has been successfully implemented with cascading dropdown functionality. The implementation follows the existing code patterns and conventions, providing a better user experience for address data collection. Once the database migration is applied, the feature will be fully functional.

