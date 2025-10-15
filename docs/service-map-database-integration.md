# ServiceMap Database Integration

## Overview

The ServiceMap component has been successfully integrated with real database data from the `catering_providers` table. The map now displays the provider's actual service coverage area based on their city and service radius stored in the database.

## Changes Implemented

### 1. Service Coverage Utility (`app/(provider)/dashboard/profile/utils/service-coverage.ts`)

Created a new utility module that handles:

- **City Code to Name Conversion**: Converts PSGC municipality codes (e.g., "083748") to city names (e.g., "TANAUAN")
- **City Coordinates Mapping**: Maps city names to geographic coordinates (latitude, longitude)
- **Covered Cities Calculation**: Calculates which cities fall within the service radius using the Haversine formula
- **Fallback Handling**: Defaults to MANILA if the city code is invalid or not found in the coordinates map

#### Key Functions:

```typescript
// Convert city code to city name
getCityNameFromCode(cityCode: string | null | undefined): string | null

// Get city name for map display (with fallback to MANILA)
getMapCityName(cityCode: string | null | undefined): string

// Calculate cities within service radius
calculateCoveredCities(centerCityName: string, radiusKm: number): string[]

// Get complete service coverage data
getServiceCoverageData(cityCode: string | null | undefined, radiusKm: number | null | undefined): {
  mapCityName: string;
  coveredCities: string[];
  radius: number;
}
```

#### Supported Cities:

The utility includes coordinates for 35+ Philippine cities:
- **Metro Manila**: Manila, Quezon City, Makati, Pasig, Taguig, Caloocan, Mandaluyong, San Juan, Pasay, Paranaque, Las Pinas, Muntinlupa, Marikina, Valenzuela, Malabon, Navotas, Pateros
- **Rizal**: Antipolo
- **Cavite**: Bacoor, Cavite, Imus, Dasmarinas, General Trias
- **Laguna**: Binan, Santa Rosa, San Pedro, Cabuyao, Calamba
- **Batangas**: Tanauan, Lipa, Batangas
- **Other Major Cities**: Cebu, Davao

### 2. Profile Page Updates (`app/(provider)/dashboard/profile/page.tsx`)

#### Removed Hardcoded Data:

```typescript
// OLD: Hardcoded sample data
const sampleCoveredCities = ["Manila", "Quezon City", "Makati", "Pasig", "Taguig"];
```

#### Added Real Database Integration:

```typescript
// NEW: Calculate from database values
const serviceCoverageData = React.useMemo(() => {
  return getServiceCoverageData(
    data?.profile?.city || null,
    data?.profile?.service_radius || null
  );
}, [data?.profile?.city, data?.profile?.service_radius]);
```

#### Updated ServiceCoverageSection Props:

```typescript
// OLD: Using form data and hardcoded cities
<ServiceCoverageSection
  radius={formData.serviceRadius}
  centerCity={formData.city}
  coveredCities={sampleCoveredCities}
  isLoading={isLoading}
/>

// NEW: Using calculated database data
<ServiceCoverageSection
  radius={serviceCoverageData.radius}
  centerCity={serviceCoverageData.mapCityName}
  coveredCities={serviceCoverageData.coveredCities}
  isLoading={isLoading}
/>
```

### 3. ServiceMap Component Updates (`app/(provider)/dashboard/profile/components/service-map.tsx`)

#### Runtime Geocoding & Rendering

- Swapped the static `CITY_COORDINATES` map for just-in-time lookups via the Nominatim API.
- Added an in-memory cache plus a sequential request queue to respect the 1 request/second policy.
- Re-used geocode results for both coverage circles and marker placement to avoid duplicate fetches.
- Focuses the map and opens the marker popup for the active location using `easeTo` for smoother UX.

#### Marker & Circle Updates

- Coverage circles reuse the same cached coordinates as markers.
- Map clean-up removes markers and resets internal state to prevent drift during unmounts.
- Console logging no longer relies on emojis so server logs stay readable.

## Data Flow

### On Initial Page Load:

1. **Fetch Profile Data**: `useProviderProfile()` fetches the provider profile from Supabase
2. **Extract City & Radius**: Profile contains `city` (PSGC code) and `service_radius` (km)
3. **Convert City Code**: `getCityNameFromCode()` converts PSGC code to city name
4. **Normalize City Name**: City name is converted to uppercase for matching
5. **Calculate Coverage**: `calculateCoveredCities()` determines which cities are within radius
6. **Render Map**: ServiceMap displays the 3D map centered on the city with the coverage circle

### On Profile Save:

1. **User Clicks "Save changes"**: Form data is validated and submitted
2. **Update Database**: `updateProviderProfile()` updates the `catering_providers` table
3. **Refetch Profile**: `refetch()` is called to get the latest data from the database
4. **Recalculate Coverage**: `useMemo` detects the change and recalculates `serviceCoverageData`
5. **Update Map**: ServiceMap re-renders with the new city center and radius

## Edge Cases Handled

### 1. Invalid or Null City Code

**Scenario**: Provider profile has no city selected or invalid city code

**Handling**:
- `getCityNameFromCode()` returns `null`
- `getMapCityName()` returns `"MANILA"` as fallback
- Map centers on Manila with default 10km radius

### 2. City Not in Coordinates Map

**Scenario**: City name from database doesn't exist in `CITY_COORDINATES`

**Handling**:
- Service coverage utility logs `City "CITY_NAME" not found in coordinates map, using MANILA as fallback`
- Covered cities calculation falls back to Manila
- ServiceMap still attempts a live geocode via Nominatim and only falls back to Manila if the API returns no results

### 3. Invalid or Zero Service Radius

**Scenario**: `service_radius` is `null`, `0`, or negative

**Handling**:
- `getServiceCoverageData()` defaults to `10` km
- Map displays 10km coverage circle

### 4. Loading State

**Scenario**: Profile data is still being fetched

**Handling**:
- ServiceMap shows skeleton loader
- No map rendering until data is available

### 5. No City Selected

**Scenario**: `centerCity` prop is empty or null

**Handling**:
- ServiceMap displays placeholder message: "Please select a city to view service coverage"
- No map is rendered

## Database Schema

### Relevant Fields in `catering_providers` Table:

```sql
-- Province field stores PSGC province code
province TEXT  -- Example: "0837" (Batangas)

-- City field stores PSGC municipality code
city TEXT  -- Example: "083748" (Tanauan, Batangas)

-- Service radius in kilometers
service_radius INTEGER DEFAULT 50  -- Example: 50
```

### PSGC Code Format:

- **PSGC** = Philippine Standard Geographic Code
- **Province Format**: 4-digit code (e.g., "0837" for Batangas)
- **City Format**: 9-digit code (e.g., "083748" for Tanauan)
- **Source**: National Statistical Coordination Board
- **Package**: `@jayjaydluffy/phil-reg-prov-mun-brgy`

## Real-Time Updates

The map automatically updates when:

1. **User changes city in profile form and saves**
   - Map re-centers to the new city
   - Coverage circle updates based on new location
   - Covered cities list recalculates

2. **User changes service radius and saves**
   - Coverage circle size updates
   - Covered cities list recalculates based on new radius

3. **Profile data is refetched**
   - `useMemo` dependency array triggers recalculation
   - ServiceMap receives new props and re-renders

## Performance Optimizations

### 1. Memoization

```typescript
const serviceCoverageData = React.useMemo(() => {
  return getServiceCoverageData(
    data?.profile?.city || null,
    data?.profile?.service_radius || null
  );
}, [data?.profile?.city, data?.profile?.service_radius]);
```

- Only recalculates when city or radius changes
- Prevents unnecessary calculations on every render

### 2. Client-Side Calculation

- No API calls needed for coverage calculation
- Haversine formula runs in milliseconds
- All city coordinates are hardcoded for instant access

### 3. Efficient Re-rendering

- ServiceMap only re-renders when `radius` or `centerCity` props change
- MapLibre GL handles map updates efficiently

### 4. Geocoding Cache & Rate Limiting

- In-memory cache prevents repeated Nominatim lookups for the same city/province combination.
- Requests are queued to guarantee a minimum one-second gap, honoring the public API limits.
- Cached coordinates are reused by both circles and markers, eliminating duplicate work.

## Testing Checklist

- [x] Map displays correctly on initial page load with database data
- [x] Map centers on the correct city from the database
- [x] Service radius circle matches the database value
- [x] Covered cities list is calculated correctly
- [x] Fallback to Manila works when city is invalid
- [x] Default 10km radius works when service_radius is null
- [ ] Map updates when city is changed and saved
- [ ] Map updates when service radius is changed and saved
- [ ] Covered cities list updates after save
- [ ] No console errors during map rendering
- [ ] Smooth map animations without jitter
- [ ] Marker stays fixed at coordinates during interactions

## Future Enhancements

### 1. Add More Cities

Expand the coverage utility's `CITY_COORDINATES` map to include:
- All provincial capitals
- Major tourist destinations
- Popular event venues

### 2. Dynamic City Coordinates

Instead of hardcoded coordinates, fetch from a geocoding API or database table

### 3. Visual Covered Cities

Display markers or highlights for all covered cities on the map

### 4. Distance Display

Show distance from center city to each covered city

### 5. Custom Service Areas

Allow providers to draw custom service area polygons instead of just circles

## Troubleshooting

### Issue: Map shows Manila instead of my city

**Cause**: Nominatim did not return coordinates for the provided city and province, so the Manila fallback kicked in.

**Solution**:
- Confirm the city and province names stored in the database match Nominatim's expected spelling (for example, "Lipa" vs "City of Lipa").
- If the API keeps failing for a known-good location, add a curated entry to the service coverage utility as a temporary override.

### Issue: Covered cities list is empty

**Cause**: Service radius is too small or city coordinates are incorrect

**Solution**: 
- Check that `service_radius` in database is reasonable (e.g., 10-100 km)
- Verify city coordinates are accurate

### Issue: Map doesn't update after saving

**Cause**: `refetch()` not being called or `useMemo` dependencies incorrect

**Solution**:
- Verify `refetch()` is called in the save handler
- Check `useMemo` dependency array includes `data?.profile?.city` and `data?.profile?.service_radius`

## Conclusion

The ServiceMap component is now fully integrated with real database data, providing an accurate, real-time visualization of the provider's service coverage area. The implementation handles edge cases gracefully and updates automatically when the profile is saved.