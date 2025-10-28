/**
 * Service Coverage Utilities
 *
 * Utilities for calculating service coverage areas and converting city codes to names
 */

import { getCityName } from "@/lib/data/philippine-locations";

// Map of city names to coordinates (lat, lng)
// Keys are normalized to uppercase for case-insensitive matching
const CITY_COORDINATES: Record<string, [number, number]> = {
  MANILA: [14.5995, 120.9842],
  "QUEZON CITY": [14.676, 121.0437],
  MAKATI: [14.5547, 121.0244],
  PASIG: [14.5764, 121.0851],
  TAGUIG: [14.5176, 121.0509],
  CALOOCAN: [14.6488, 120.983],
  MANDALUYONG: [14.5794, 121.0359],
  "SAN JUAN": [14.6019, 121.0355],
  PASAY: [14.5378, 121.0014],
  PARAÑAQUE: [14.4793, 121.0198],
  "LAS PIÑAS": [14.4453, 121.012],
  MUNTINLUPA: [14.3811, 121.0437],
  MARIKINA: [14.6507, 121.1029],
  VALENZUELA: [14.6989, 120.983],
  MALABON: [14.662, 120.957],
  NAVOTAS: [14.6618, 120.9402],
  PATEROS: [14.5436, 121.0669],
  CEBU: [10.3157, 123.8854],
  DAVAO: [7.1907, 125.4553],
  ANTIPOLO: [14.5863, 121.176],
  BACOOR: [14.459, 120.945],
  CAVITE: [14.4791, 120.897],
  IMUS: [14.4297, 120.9367],
  DASMARIÑAS: [14.3294, 120.9366],
  "GENERAL TRIAS": [14.3869, 120.8811],
  BIÑAN: [14.3369, 121.0806],
  "SANTA ROSA": [14.3123, 121.1114],
  "SAN PEDRO": [14.3583, 121.0167],
  CABUYAO: [14.2789, 121.1253],
  CALAMBA: [14.2117, 121.1653],
  // Batangas cities
  TANAUAN: [14.0858, 121.1503],
  LIPA: [13.9411, 121.1624],
  BATANGAS: [13.7565, 121.0583],
  // Leyte cities
  BARUGO: [11.3002, 124.7327],
  TACLOBAN: [11.2447, 125.0047],
  ORMOC: [11.0059, 124.6074],
};

/**
 * Convert city code (PSGC mun_code) to city name
 * @param cityCode - PSGC municipality code (e.g., "083748")
 * @returns City name or null if not found
 */
export function getCityNameFromCode(cityCode: string | null | undefined): string | null {
  if (!cityCode) return null;

  try {
    const cityName = getCityName(cityCode);
    return cityName;
  } catch (error) {
    console.error("Failed to get city name from code:", error);
    return null;
  }
}

/**
 * Get city name for map display
 * Falls back to MANILA if city code is invalid or city not found in coordinates
 * @param cityCode - PSGC municipality code
 * @returns City name that exists in CITY_COORDINATES (uppercase), or "MANILA" as fallback
 */
export function getMapCityName(cityCode: string | null | undefined): string {
  const cityName = getCityNameFromCode(cityCode);

  if (!cityName) return "MANILA";

  // Normalize to uppercase for case-insensitive matching
  const normalizedCityName = cityName.toUpperCase();

  // Check if the city name exists in our coordinates map
  if (CITY_COORDINATES[normalizedCityName]) {
    return normalizedCityName;
  }

  // If not found, return MANILA as fallback
  console.warn(`City "${cityName}" not found in coordinates map, using MANILA as fallback`);
  return "MANILA";
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate cities covered by service radius
 * @param centerCityName - Name of the center city
 * @param radiusKm - Service radius in kilometers
 * @returns Array of city names within the radius
 */
export function calculateCoveredCities(
  centerCityName: string,
  radiusKm: number
): string[] {
  const centerCoords = CITY_COORDINATES[centerCityName];

  if (!centerCoords || !radiusKm || radiusKm <= 0) {
    return [];
  }

  const [centerLat, centerLon] = centerCoords;
  const coveredCities: string[] = [];

  // Check each city in our coordinates map
  for (const [cityName, [lat, lon]] of Object.entries(CITY_COORDINATES)) {
    const distance = calculateDistance(centerLat, centerLon, lat, lon);

    if (distance <= radiusKm) {
      coveredCities.push(cityName);
    }
  }

  // Sort alphabetically
  return coveredCities.sort();
}

/**
 * Get service coverage data for display
 * @param cityCode - PSGC municipality code
 * @param radiusKm - Service radius in kilometers
 * @returns Object with map city name and covered cities array
 */
export function getServiceCoverageData(
  cityCode: string | null | undefined,
  radiusKm: number | null | undefined
): {
  mapCityName: string;
  coveredCities: string[];
  radius: number;
} {
  const mapCityName = getMapCityName(cityCode);
  const radius = radiusKm && radiusKm > 0 ? radiusKm : 10; // Default to 10km if invalid

  const coveredCities = calculateCoveredCities(mapCityName, radius);

  return {
    mapCityName,
    coveredCities,
    radius,
  };
}

