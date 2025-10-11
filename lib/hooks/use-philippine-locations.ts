/**
 * React hooks for Philippine location data
 * 
 * These hooks provide access to Philippine location data with memoization
 * for optimal performance. Since the data is static and loaded from an npm
 * package, there's no need for SWR or data fetching.
 */

import { useMemo } from "react";
import { ComboboxOption } from "@/components/ui/combobox";
import {
  getProvinces,
  getCitiesAndMunicipalities,
  getCitiesByProvince,
  getBarangaysByCity,
  getCityName,
  getBarangayName,
  sortAlphabetically,
} from "@/lib/data/philippine-locations";

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
/**
 * Hook to get barangays for a specific city as Combobox options
 * Data is memoized based on the city code
 *
 * Note: Barangays don't have unique codes in the package, so we use
 * a combination of mun_code and index as the value
 *
 * @param cityCode - The city/municipality code (mun_code)
 */
export function useBarangays(cityCode: string | null) {
  const barangays = useMemo(() => {
    try {
      if (!cityCode) return [] as ComboboxOption[];

      const allBarangays = getBarangaysByCity(cityCode);
      const options: ComboboxOption[] = allBarangays
        .filter((b) => b && typeof b.name === "string" && b.name.length > 0)
        .map((b, index) => ({
          value: `${b.mun_code}-${index}`,
          label: String(b.name ?? "").trim(),
        }))
        .filter((opt) => opt.label.length > 0);
      return sortAlphabetically(options);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("useBarangays failed to build options", e);
      }
      return [] as ComboboxOption[];
    }
  }, [cityCode]);

  return {
    barangays,
    isLoading: false,
    error: null,
  };
}

/**
 * Hook to get city name from city code
 * Returns null if city code is not found
 * 
 * @param cityCode - The city/municipality code (mun_code)
 */
export function useCityName(cityCode: string | null): string | null {
  return useMemo(() => {
    if (!cityCode) return null;
    return getCityName(cityCode);
  }, [cityCode]);
}

/**
 * Hook to get barangay name from barangay code
 * Returns null if barangay code is not found
 * 
 * @param cityCode - The city/municipality code (mun_code)
 * @param barangayCode - The barangay code (brgy_code)
 */
export function useBarangayName(
  cityCode: string | null,
  barangayCode: string | null
): string | null {
  return useMemo(() => {
    if (!cityCode || !barangayCode) return null;
    return getBarangayName(cityCode, barangayCode);
  }, [cityCode, barangayCode]);
}

