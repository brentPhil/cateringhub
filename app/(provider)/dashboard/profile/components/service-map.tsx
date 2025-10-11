/**
 * ServiceMap Component
 *
 * Displays an interactive map showing the service coverage area using OpenFreeMap.
 *
 * Implementation follows the official OpenFreeMap "Using Leaflet" guide:
 * @see https://openfreemap.org/quick_start/#using-leaflet
 *
 * Official Approach:
 * - Uses MapLibre GL Leaflet integration (@maplibre/maplibre-gl-leaflet)
 * - Uses vector tile styles instead of raster tiles
 * - Style URL: https://tiles.openfreemap.org/styles/liberty (default style with 3D buildings)
 * - Available styles: liberty, bright, positron
 * - Zoom level set to 15.5 to enable 3D building extrusions on first load
 * - Pitch set to 60 degrees for 3D perspective view (angled camera)
 * - 3D buildings automatically render at zoom 15+ with the Liberty style
 *
 * Why MapLibre GL Leaflet?
 * - Official OpenFreeMap recommendation for Leaflet users
 * - Better performance with vector tiles (smaller file sizes)
 * - More styling options and customization
 * - Future-proof approach
 *
 * Dependencies:
 * - leaflet: Base mapping library
 * - maplibre-gl: Vector tile rendering engine
 * - @maplibre/maplibre-gl-leaflet: Integration layer between Leaflet and MapLibre GL
 * - react-leaflet: React bindings for Leaflet
 */
"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface MapLocation {
  id: string;
  city: string;
  serviceRadius: number;
  isPrimary: boolean;
}

interface ServiceMapProps {
  locations: MapLocation[];
  activeLocationId: string | null;
  onLocationClick?: (locationId: string) => void;
  isLoading?: boolean;
}

/**
 * Creates a GeoJSON circle polygon for MapLibre GL
 * @param lon - Longitude of the center point
 * @param lat - Latitude of the center point
 * @param radiusInKm - Radius of the circle in kilometers
 * @returns GeoJSON Feature representing a circle
 */
function createCircleGeoJSON(
  lon: number,
  lat: number,
  radiusInKm: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64; // Number of points to create smooth circle
  const coords: [number, number][] = [];

  // Earth's radius in kilometers
  const earthRadius = 6371;

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const angleRad = (angle * Math.PI) / 180;

    // Calculate offset in degrees
    const latOffset =
      (radiusInKm / earthRadius) * (180 / Math.PI) * Math.cos(angleRad);
    const lonOffset =
      (radiusInKm / earthRadius) *
      (180 / Math.PI) *
      Math.sin(angleRad) *
      (1 / Math.cos((lat * Math.PI) / 180));

    coords.push([lon + lonOffset, lat + latOffset]);
  }

  // Close the polygon by adding the first point at the end
  coords.push(coords[0]);

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

/**
 * Gets a usable color for MapLibre GL from CSS variables
 * Falls back to a default blue color if parsing fails
 * @returns RGB hex color string (e.g., "#3b82f6")
 */
function getPrimaryColor(): string {
  try {
    // Try to get the primary color from CSS variable
    const primaryColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--primary");

    // If it's oklch or other modern format, use a default color
    // MapLibre GL doesn't support oklch, so we use a fallback
    if (
      primaryColor.includes("oklch") ||
      primaryColor.includes("hsl") ||
      !primaryColor.trim()
    ) {
      // Use a nice blue color as default (Tailwind blue-500)
      return "#3b82f6";
    }

    return primaryColor.trim();
  } catch (error) {
    console.warn("Failed to get primary color, using default:", error);
    return "#3b82f6"; // Default blue color
  }
}

/**
 * Calculates the appropriate zoom level based on service radius
 * to ensure the entire coverage area is visible on the map
 *
 * SIMPLE CONFIGURATION - Only 2 parameters to adjust:
 *
 * 1. ZOOM_SENSITIVITY (0.5 to 2.0)
 *    - Controls how quickly the map zooms out as radius increases
 *    - Lower value (0.5) = zooms out slowly, keeps map more zoomed in
 *    - Higher value (2.0) = zooms out quickly, shows wider area
 *    - Default: 1.0 (balanced)
 *
 * 2. MARGIN_PERCENTAGE (0% to 100%)
 *    - Controls how much empty space appears around the circle
 *    - 0% = circle touches viewport edges (tight fit)
 *    - 50% = circle takes up 2/3 of viewport (comfortable)
 *    - 100% = circle takes up 1/2 of viewport (lots of margin)
 *    - Default: 40% (good balance)
 *
 * @param radiusKm - Service radius in kilometers (supports any positive value)
 * @returns Zoom level (higher = more zoomed in, lower = more zoomed out)
 */
function calculateZoomLevel(radiusKm: number): number {
  // ========================================
  // ADJUST THESE TWO VALUES TO TUNE BEHAVIOR
  // ========================================

  /**
   * ZOOM_SENSITIVITY: How responsive the zoom is to radius changes
   * - Increase this to zoom out faster when radius grows
   * - Decrease this to keep the map more zoomed in
   * - Typical range: 0.5 to 2.0
   * - Current: 1.0 (balanced - each doubling of radius reduces zoom by ~1 level)
   */
  const ZOOM_SENSITIVITY = 1.0;

  /**
   * MARGIN_PERCENTAGE: How much empty space around the circle
   * - Increase this to add more margin (circle appears smaller in viewport)
   * - Decrease this to reduce margin (circle fills more of viewport)
   * - Typical range: 0 to 100 (represents percentage)
   * - Current: 40 (circle takes up ~71% of viewport, 40% margin around it)
   */
  const MARGIN_PERCENTAGE = 40;

  // ========================================
  // CALCULATION (no need to modify below)
  // ========================================

  // Convert margin percentage to multiplier
  // 0% margin = 1.0x (no extra space), 50% margin = 1.5x, 100% margin = 2.0x
  const marginMultiplier = 1 + MARGIN_PERCENTAGE / 100;

  // Apply margin to get effective radius that includes padding
  const effectiveRadius = radiusKm * marginMultiplier;

  // Base zoom level for a 10km radius (reference point)
  // This is calibrated so 10km radius shows nicely on screen
  const baseZoom = 11;
  const baseRadius = 10;

  // Calculate zoom using logarithmic formula
  // Formula: zoom = baseZoom - log2(effectiveRadius / baseRadius) * sensitivity
  // This means each doubling of radius reduces zoom by ~sensitivity levels
  const calculatedZoom =
    baseZoom - Math.log2(effectiveRadius / baseRadius) * ZOOM_SENSITIVITY;

  // Clamp to valid MapLibre GL zoom range
  const minZoom = 1; // World view
  const maxZoom = 20; // Street level
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, calculatedZoom));

  // Round to 1 decimal place for smooth transitions
  return Math.round(clampedZoom * 10) / 10;
}

// Hardcoded coordinates for major Philippine cities
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
  // Eastern Visayas and nearby key cities
  TACLOBAN: [11.2447, 125.0036],
  ORMOC: [11.0059, 124.6074],
  TANAUAN: [11.1097, 125.015],
  BAYBAY: [10.6785, 124.8006],
  MAASIN: [10.1325, 124.8447],
  CALBAYOG: [12.0665, 124.5966],
  CATBALOGAN: [11.7753, 124.8861],
  "SANTA ROSA": [14.3123, 121.1114],
  "SAN PEDRO": [14.3583, 121.0167],
  CABUYAO: [14.2789, 121.1253],
  CALAMBA: [14.2117, 121.1653],
  // Batangas cities
  "TANAUAN CITY (BATANGAS)": [14.0858, 121.1503],
  LIPA: [13.9411, 121.1624],
  BATANGAS: [13.7565, 121.0583],
};

/**
 * MapContent Component
 *
 * Implements the official OpenFreeMap + Leaflet integration using MapLibre GL.
 * This follows the exact pattern from https://openfreemap.org/quick_start/#using-leaflet
 */
function MapContent({
  locations,
  activeLocationId: _activeLocationId,
  onLocationClick,
}: {
  locations: MapLocation[];
  activeLocationId: string | null;
  onLocationClick?: (locationId: string) => void;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const [mapError, setMapError] = React.useState(false);
  const [mapReady, setMapReady] = React.useState(false);

  // DEBUG: Log locations array being passed to MapContent
  console.log("🔍 [MapContent] Locations array:", locations);
  console.log("🔍 [MapContent] Number of locations:", locations.length);
  console.log(
    "🔍 [MapContent] Locations details:",
    JSON.stringify(locations, null, 2)
  );

  // Determine primary location for initial center/zoom (fallback to first)
  const primaryLocation =
    locations.find((loc) => loc.isPrimary) || locations[0];

  // Coordinates for primary location's city, default to MANILA if not found
  const coordinates = primaryLocation
    ? CITY_COORDINATES[primaryLocation.city] || CITY_COORDINATES["MANILA"]
    : CITY_COORDINATES["MANILA"];

  const primaryRadius = primaryLocation?.serviceRadius ?? 50;

  // Calculate zoom level based on primary location's service radius
  const zoomLevel = calculateZoomLevel(primaryRadius);

  // Initialize map once
  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let glMap: any = null;

    const initMap = async () => {
      try {
        // Import MapLibre GL directly (no Leaflet wrapper to avoid conflicts)
        const maplibregl = await import("maplibre-gl");

        // Import CSS
        await import("maplibre-gl/dist/maplibre-gl.css");

        // Check again if map was already initialized (React StrictMode double-mount protection)
        if (mapInstanceRef.current) return;

        // Clear any existing map container content
        if (mapRef.current) {
          mapRef.current.innerHTML = "";
        }

        console.log("🗺️ Initializing MapLibre GL map...");
        console.log("🗺️ Primary service radius:", primaryRadius, "km");
        console.log("🗺️ Calculated zoom level:", zoomLevel);
        console.log("🗺️ Centered on primary location");

        // Initialize MapLibre GL map directly (no Leaflet wrapper)
        // This eliminates coordinate system conflicts and improves performance
        glMap = new maplibregl.default.Map({
          container: mapRef.current!,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [coordinates[1], coordinates[0]], // [lng, lat]
          zoom: zoomLevel, // Dynamic zoom based on service radius
          pitch: 60, // 3D perspective
          bearing: 0, // North-up
          scrollZoom: false, // Disable scroll zoom for better UX
        });

        console.log("🗺️ Map instance created");

        // Add navigation controls (zoom buttons)
        glMap.addControl(
          new maplibregl.default.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          "top-right"
        );

        // Wait for the map to load before adding custom layers
        glMap.on("load", () => {
          console.log("🗺️ Map loaded, adding custom layers...");

          try {
            // Build a FeatureCollection of coverage circles for ALL locations
            const features = locations
              .filter((loc) => !!loc.city)
              .map((loc) => {
                const key = (loc.city || "").toUpperCase();
                const coords = CITY_COORDINATES[key];
                if (!coords) {
                  console.warn(
                    "⚠️ [Map] Missing coordinates for city:",
                    key,
                    "- falling back to MANILA"
                  );
                }
                const c = coords || CITY_COORDINATES["MANILA"];
                return createCircleGeoJSON(c[1], c[0], loc.serviceRadius ?? 50);
              });

            const circlesCollection = {
              type: "FeatureCollection" as const,
              features,
            };

            // Add a single source containing all circles
            glMap.addSource("service-radii", {
              type: "geojson",
              data: circlesCollection,
            });

            const circleColor = getPrimaryColor();

            // Add fill layer for all circles
            glMap.addLayer({
              id: "service-radii-fill",
              type: "fill",
              source: "service-radii",
              paint: {
                "fill-color": circleColor,
                "fill-opacity": 0.2,
              },
            });

            // Add outline layer for all circles
            glMap.addLayer({
              id: "service-radii-outline",
              type: "line",
              source: "service-radii",
              paint: {
                "line-color": circleColor,
                "line-width": 2,
              },
            });

            console.log(
              "✅ Service coverage circles rendered for all locations"
            );

            // Add markers for all locations
            console.log(
              "🔍 [Markers] Starting to create markers for locations..."
            );
            console.log(
              "🔍 [Markers] Total locations to process:",
              locations.length
            );

            locations.forEach((location, index) => {
              console.log(
                `🔍 [Marker ${index + 1}/${
                  locations.length
                }] Processing location:`,
                {
                  id: location.id,
                  city: location.city,
                  isPrimary: location.isPrimary,
                  serviceRadius: location.serviceRadius,
                }
              );

              const key = (location.city || "").toUpperCase();
              const locationCoords =
                CITY_COORDINATES[key] || CITY_COORDINATES["MANILA"];

              const foundCoords = !!CITY_COORDINATES[key];
              console.log(`🔍 [Marker ${index + 1}] City lookup:`, {
                cityName: key,
                foundCoords,
                coords: locationCoords,
                usingFallback: !foundCoords,
              });
              if (!foundCoords) {
                console.warn(
                  "⚠️ [Map] Missing coordinates for city:",
                  key,
                  "- falling back to MANILA"
                );
              }

              const isPrimary = location.isPrimary;
              // Create marker element
              const markerElement = document.createElement("div");
              markerElement.className = "custom-marker";
              markerElement.style.width = "25px";
              markerElement.style.height = "41px";
              markerElement.style.cursor = "pointer";
              markerElement.style.transition = "all 0.2s ease";

              // Primary location: gold/yellow marker, others: blue marker
              const markerColor = isPrimary ? "#F59E0B" : "#3B82F6"; // amber-500 : blue-500
              const markerSvg = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.6 12.5 28.5 12.5 28.5S25 23.1 25 12.5C25 5.6 19.4 0 12.5 0zm0 17.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="${markerColor}"/></svg>`;
              markerElement.style.backgroundImage = `url(data:image/svg+xml;base64,${btoa(
                markerSvg
              )})`;
              markerElement.style.backgroundSize = "contain";

              console.log(
                `🔍 [Marker ${index + 1}] Creating MapLibre marker...`
              );

              const marker = new maplibregl.default.Marker({
                element: markerElement,
                anchor: "bottom",
              })
                .setLngLat([locationCoords[1], locationCoords[0]])
                .setPopup(
                  new maplibregl.default.Popup({ offset: 25 }).setHTML(
                    `<div style="font-size: 14px; padding: 4px;">
                      <strong>${location.city}</strong>
                      ${
                        isPrimary
                          ? '<br/><span style="font-size: 11px; color: #F59E0B;">⭐ Primary location</span>'
                          : ""
                      }
                      <br/><span style="font-size: 12px; color: #666;">Radius: ${
                        location.serviceRadius
                      } km</span>
                    </div>`
                  )
                )
                .addTo(glMap);

              console.log(
                `🔍 [Marker ${index + 1}] Marker created and added to map:`,
                {
                  lngLat: [locationCoords[1], locationCoords[0]],
                  markerObject: marker,
                }
              );

              // Add click handler
              markerElement.addEventListener("click", () => {
                console.log(
                  `🔍 [Marker Click] Marker clicked for location:`,
                  location.id
                );
                if (onLocationClick) {
                  onLocationClick(location.id);
                }
              });

              // Store marker reference
              markersRef.current.set(location.id, marker);

              console.log(
                `🔍 [Marker ${index + 1}] Marker stored in markersRef with ID:`,
                location.id
              );
            });

            console.log("🔍 [Markers] Finished creating all markers");
            console.log(
              "🔍 [Markers] Total markers in markersRef:",
              markersRef.current.size
            );
            console.log(
              "🔍 [Markers] Marker IDs in markersRef:",
              Array.from(markersRef.current.keys())
            );

            console.log(`✅ ${locations.length} markers added`);
          } catch (error) {
            console.error("❌ Failed to add custom layers:", error);
          }
        });

        // Error handling for tile loading
        glMap.on("error", (e: any) => {
          console.warn("🗺️ Map error (non-critical):", e.error?.message || e);
        });

        mapInstanceRef.current = glMap;
        setMapReady(true);
      } catch (error) {
        console.error("❌ Failed to initialize map:", error);
        setMapError(true);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (glMap) {
        // Remove all markers
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();
        glMap.remove();
        mapInstanceRef.current = null;
      }
    };
    // Only re-initialize if locations or active location changes
  }, [locations, onLocationClick]);

  // Update coverage circles when locations or radii change
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    try {
      const features = locations
        .filter((loc) => !!loc.city)
        .map((loc) => {
          const c = CITY_COORDINATES[loc.city] || CITY_COORDINATES["MANILA"];
          return createCircleGeoJSON(c[1], c[0], loc.serviceRadius ?? 50);
        });

      const circlesCollection = {
        type: "FeatureCollection" as const,
        features,
      };

      const source = map.getSource("service-radii");
      if (source) {
        source.setData(circlesCollection as any);
      }
    } catch (error) {
      console.error("❌ Failed to update circles:", error);
    }
  }, [locations, mapReady]);

  if (mapError) {
    return (
      <div className="h-[400px] w-full bg-muted/30 rounded-lg flex items-center justify-center border border-border">
        <p className="text-sm text-muted-foreground">Unable to load map</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <Skeleton className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

export function ServiceMap({
  locations,
  activeLocationId,
  onLocationClick,
  isLoading,
}: ServiceMapProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="h-[400px] w-full bg-muted/30 rounded-lg flex items-center justify-center border border-border">
        <p className="text-sm text-muted-foreground">
          Please add a service location to view coverage
        </p>
      </div>
    );
  }

  // Only render map on client side after mount
  if (!mounted) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  return (
    <MapContent
      locations={locations}
      activeLocationId={activeLocationId}
      onLocationClick={onLocationClick}
    />
  );
}
