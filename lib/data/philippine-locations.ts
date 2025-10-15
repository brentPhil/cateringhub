/**
 * Philippine Location Data
 *
 * Provides access to Philippine location data (regions, provinces, cities, municipalities, barangays)
 * Data source: National Statistical Coordination Board via @jayjaydluffy/phil-reg-prov-mun-brgy
 * Package: https://www.npmjs.com/package/@jayjaydluffy/phil-reg-prov-mun-brgy
 *
 * This uses a static npm package instead of an API to avoid:
 * - Network requests and CORS issues
 * - API rate limits and payment requirements
 * - Dependency on external services
 *
 * Trade-off: Adds ~3.5MB to bundle size, but provides instant access to all location data
 */

import phil from "@jayjaydluffy/phil-reg-prov-mun-brgy";

// Re-export types from the package
// Note: The package uses "name" for all location names
export type PhilRegion = {
  reg_code: string;
  name: string;
};

export type PhilProvince = {
  prov_code: string;
  name: string;
  reg_code: string;
};

export type PhilCityMunicipality = {
  mun_code: string;
  name: string;
  prov_code: string;
};

export type PhilBarangay = {
  name: string;
  mun_code: string;
};

// Combobox option type for UI components
export type ComboboxOption = {
  value: string;
  label: string;
};

/**
 * Get all regions
 */
export function getRegions(): PhilRegion[] {
  return phil.regions as PhilRegion[];
}

/**
 * Get all provinces
 */
export function getProvinces(): PhilProvince[] {
  return phil.provinces as PhilProvince[];
}

/**
 * Get provinces by region
 */
export function getProvincesByRegion(regionCode: string): PhilProvince[] {
  return phil.getProvincesByRegion(regionCode) as PhilProvince[];
}

/**
 * Get all cities and municipalities
 */
export function getCitiesAndMunicipalities(): PhilCityMunicipality[] {
  return phil.city_mun as PhilCityMunicipality[];
}

/**
 * Get cities and municipalities by province
 */
export function getCitiesByProvince(provinceCode: string): PhilCityMunicipality[] {
  return phil.getCityMunByProvince(provinceCode) as PhilCityMunicipality[];
}

/**
 * Get all barangays
 */
export function getAllBarangays(): PhilBarangay[] {
  return phil.barangays as PhilBarangay[];
}

/**
 * Get barangays by city/municipality
 */
export function getBarangaysByCity(cityCode: string): PhilBarangay[] {
  return phil.getBarangayByMun(cityCode) as PhilBarangay[];
}

/**
 * Convert cities to Combobox options
 */
export function citiesToComboboxOptions(cities: PhilCityMunicipality[]): ComboboxOption[] {
  return cities
    .filter((city) => city && typeof city.mun_code === "string" && city.mun_code.length > 0)
    .map((city) => {
      const raw = typeof city.name === "string" ? city.name : "";
      const label = normalizeLabel(raw);
      return { value: city.mun_code, label };
    })
    .filter((opt) => opt.label.length > 0);
}

/**
 * Convert barangays to Combobox options
 * Note: Barangays don't have a unique code, so we use the name as both value and label
 */
export function barangaysToComboboxOptions(barangays: PhilBarangay[]): ComboboxOption[] {
  return barangays
    .filter((barangay) => barangay && typeof barangay.name === "string" && barangay.name.length > 0)
    .map((barangay, index) => {
      const raw = typeof barangay.name === "string" ? barangay.name : "";
      const label = normalizeLabel(raw);
      // Use a combination of mun_code and index as unique value since barangays don't have unique codes
      return { value: `${barangay.mun_code}-${index}`, label };
    })
    .filter((opt) => opt.label.length > 0);
}

/**
 * Get city name by code
 */
export function getCityName(cityCode: string): string | null {
  const cities = getCitiesAndMunicipalities();
  const city = cities.find((c) => c.mun_code === cityCode);
  return city && typeof city.name === "string" ? normalizeLabel(city.name) : null;
}

/**
 * Get province name by code
 */
export function getProvinceName(provinceCode: string): string | null {
  const provinces = getProvinces();
  const province = provinces.find((p) => p.prov_code === provinceCode);
  return province && typeof province.name === "string" ? normalizeLabel(province.name) : null;
}

/**
 * Get barangay name by value (format: "mun_code-index")
 * Since barangays don't have unique codes, we use the combined value
 */
export function getBarangayName(cityCode: string, barangayValue: string): string | null {
  const barangays = getBarangaysByCity(cityCode);
  // Extract index from the value (format: "mun_code-index")
  const parts = barangayValue.split('-');
  const index = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : -1;

  if (index >= 0 && index < barangays.length) {
    const barangay = barangays[index];
    return barangay && typeof barangay.name === "string" ? normalizeLabel(barangay.name) : null;
  }

  return null;
}

/**
 * Search cities by query
 */
export function searchCities(query: string): PhilCityMunicipality[] {
  if (!query) return getCitiesAndMunicipalities();

  const lowerQuery = query.toLowerCase();
  return getCitiesAndMunicipalities().filter(
    (city) => typeof city.name === "string" && city.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search barangays in a city by query
 */
export function searchBarangaysInCity(cityCode: string, query: string): PhilBarangay[] {
  const barangays = getBarangaysByCity(cityCode);

  if (!query) return barangays;

  const lowerQuery = query.toLowerCase();
  return barangays.filter(
    (barangay) => typeof barangay.name === "string" && barangay.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Convert string to title case
 * Handles uppercase strings from the data source
 */
export function toTitleCase(input: unknown): string {
  if (typeof input !== "string") return "";
  const str = input.trim().toLowerCase();
  if (!str) return "";
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Normalize a display label safely
 */
function normalizeLabel(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Keep original casing for now to avoid surprises; optional: use toTitleCase(trimmed)
  return trimmed;
}

/**
 * Sort array alphabetically
 */
export function sortAlphabetically<T extends { label: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.label.localeCompare(b.label));
}

