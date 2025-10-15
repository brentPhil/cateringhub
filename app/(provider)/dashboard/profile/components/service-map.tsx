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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Coordinates = [number, number];

const GEOCODE_MIN_INTERVAL_MS = 1000;
const geocodeCache = new Map<string, Coordinates>();
const pendingGeocodeRequests = new Map<string, Promise<Coordinates | null>>();
let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastGeocodeTimestamp = 0;

function normalizeLocationPart(value?: string): string {
  return value?.trim() ?? "";
}

function formatLocationForQuery(value?: string): string {
  const trimmed = normalizeLocationPart(value);
  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/)
    .map((segment) => {
      if (!segment) return "";
      const lower = segment.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function toSentenceCase(value?: string | null): string {
  if (!value) return "Unknown location";
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function buildGeocodeCacheKey(cityName: string, provinceName?: string): string {
  const normalizedCity = normalizeLocationPart(cityName).toUpperCase();
  const normalizedProvince = normalizeLocationPart(provinceName).toUpperCase();
  return normalizedProvince
    ? `${normalizedCity},${normalizedProvince}`
    : normalizedCity;
}

async function runWithRateLimit<T>(task: () => Promise<T>): Promise<T> {
  const execution = geocodeQueue.then(async () => {
    if (lastGeocodeTimestamp) {
      const elapsed = Date.now() - lastGeocodeTimestamp;
      const waitTime = GEOCODE_MIN_INTERVAL_MS - elapsed;
      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }

    const result = await task();
    lastGeocodeTimestamp = Date.now();
    return result;
  });

  geocodeQueue = execution.then(
    () => undefined,
    () => undefined
  );

  return execution;
}

/**
 * Geocode a city name to coordinates using the Nominatim API.
 * Requests are rate-limited (<= 1 per second) and cached per city/province pair.
 * @param cityName - Name of the city (e.g., "Tacloban", "Ormoc")
 * @param provinceName - Optional province name for disambiguation (e.g., "Leyte", "Batangas")
 * @returns Promise<[lat, lng] | null>
 */
async function geocodeCity(
  cityName: string,
  provinceName?: string
): Promise<Coordinates | null> {
  const trimmedCity = normalizeLocationPart(cityName);
  if (!trimmedCity) {
    return null;
  }

  const trimmedProvince = normalizeLocationPart(provinceName);
  const cacheKey = buildGeocodeCacheKey(trimmedCity, trimmedProvince);

  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = pendingGeocodeRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = runWithRateLimit(async () => {
    const queryCity = formatLocationForQuery(trimmedCity);
    const queryProvince = formatLocationForQuery(trimmedProvince);
    const locationQuery = queryProvince
      ? `${queryCity}, ${queryProvince}, Philippines`
      : `${queryCity}, Philippines`;

    try {
      const query = encodeURIComponent(locationQuery);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "CateringHub/1.0 (contact@cateringhub.local)",
        },
      });
      if (!response.ok) {
        console.error(`Failed to geocode ${trimmedCity}:`, response.statusText);
        return null;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = Number.parseFloat(data[0].lat);
        const lng = Number.parseFloat(data[0].lon);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng] as Coordinates;
        }
      }

      console.warn(`No geocoding results found for "${trimmedCity}"`);
      return null;
    } catch (error) {
      console.error(`Error geocoding "${trimmedCity}":`, error);
      return null;
    }
  });

  const wrappedRequest = request
    .then((coords) => {
      if (coords) {
        geocodeCache.set(cacheKey, coords);
      }
      return coords;
    })
    .finally(() => {
      pendingGeocodeRequests.delete(cacheKey);
    });

  pendingGeocodeRequests.set(cacheKey, wrappedRequest);
  return wrappedRequest;
}

export interface MapLocation {
  id: string;
  city: string;
  province?: string; // Optional province name for geocoding disambiguation
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
  const angularDistance = radiusInKm / earthRadius;
  const degreesPerRadian = 180 / Math.PI;
  const latitudeInRadians = (lat * Math.PI) / 180;
  const latCosine = Math.cos(latitudeInRadians);

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const angleRad = (angle * Math.PI) / 180;

    // Calculate offset in degrees
    const latOffset = angularDistance * degreesPerRadian * Math.cos(angleRad);
    const lonOffset =
      angularDistance *
      degreesPerRadian *
      Math.sin(angleRad) *
      (latCosine !== 0 ? 1 / latCosine : 0);

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

// Manila coordinates as fallback when geocoding fails
const MANILA_COORDS: [number, number] = [14.5995, 120.9842];

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
  const [initialCenter, setInitialCenter] = React.useState<Coordinates | null>(
    null
  );
  const [initialCenterResolved, setInitialCenterResolved] =
    React.useState(false);

  // Determine primary location for initial center/zoom (fallback to first)
  const primaryLocation = React.useMemo(
    () => locations.find((loc) => loc.isPrimary) || locations[0],
    [locations]
  );

  const primaryRadius = primaryLocation?.serviceRadius ?? 50;

  // Calculate zoom level based on primary location's service radius
  const zoomLevel = calculateZoomLevel(primaryRadius);

  // Resolve initial map center before rendering the map to avoid showing fallback coordinates.
  React.useEffect(() => {
    if (mapInstanceRef.current) {
      return;
    }

    let cancelled = false;

    setInitialCenterResolved(false);

    const resolveInitialCenter = async () => {
      if (!primaryLocation) {
        if (!cancelled) {
          setInitialCenter(MANILA_COORDS);
          setInitialCenterResolved(true);
        }
        return;
      }

      const coords = await geocodeCity(
        primaryLocation.city,
        primaryLocation.province
      );

      if (cancelled) return;

      setInitialCenter(coords ?? MANILA_COORDS);
      setInitialCenterResolved(true);
    };

    resolveInitialCenter();

    return () => {
      cancelled = true;
    };
  }, [primaryLocation?.city, primaryLocation?.province, primaryLocation?.id]);

  // Initialize map once we have the initial center coordinates
  React.useEffect(() => {
    if (
      !mapRef.current ||
      mapInstanceRef.current ||
      !initialCenterResolved ||
      !initialCenter
    )
      return;

    let glMap: any = null;

    const initMap = async () => {
      try {
        // Import MapLibre GL directly (no Leaflet wrapper to avoid conflicts)
        const { default: maplibre } = await import("maplibre-gl");

        // Import CSS
        await import("maplibre-gl/dist/maplibre-gl.css");

        // Check again if map was already initialized (React StrictMode double-mount protection)
        if (mapInstanceRef.current) return;

        // Clear any existing map container content
        if (mapRef.current) {
          mapRef.current.innerHTML = "";
        }

        // Initialize MapLibre GL map directly (no Leaflet wrapper)
        // This eliminates coordinate system conflicts and improves performance
        glMap = new maplibre.Map({
          container: mapRef.current!,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [initialCenter[1], initialCenter[0]], // [lng, lat]
          zoom: zoomLevel, // Dynamic zoom based on service radius
          pitch: 60, // 3D perspective
          bearing: 0, // North-up
          scrollZoom: false, // Disable scroll zoom for better UX
        });

        // Add navigation controls (zoom buttons)
        glMap.addControl(
          new maplibre.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          "top-right"
        );

        // Wait for the map to load before marking it as ready
        glMap.on("load", () => {
          setMapReady(true);
        });

        // Error handling for tile loading
        glMap.on("error", (e: any) => {
          console.warn("Map warning (non-critical):", e?.error?.message ?? e);
        });

        mapInstanceRef.current = glMap;
      } catch (error) {
        console.error("Failed to initialize map:", error);
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
        setMapReady(false);
      }
    };
    // Only initialize map once we have initial center - do NOT add dependencies that would cause re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter]);

  // Store onLocationClick in a ref to avoid recreating markers when it changes
  const onLocationClickRef = React.useRef(onLocationClick);
  React.useEffect(() => {
    onLocationClickRef.current = onLocationClick;
  }, [onLocationClick]);

  // Serialize locations to avoid unnecessary re-renders when array reference changes
  const locationsKey = React.useMemo(
    () =>
      locations
        .map(
          (loc) =>
            `${loc.id}-${loc.city}-${loc.province}-${loc.serviceRadius}-${loc.isPrimary}`
        )
        .join("|"),
    [locations]
  );

  const focusOnLocation = React.useCallback(
    (locationId: string | null) => {
      if (!mapReady || !locationId) return;

      const map = mapInstanceRef.current;
      if (!map) return;

      const marker = markersRef.current.get(locationId);
      if (!marker) return;

      const popup = marker.getPopup();
      if (popup && !popup.isOpen()) {
        popup.addTo(map);
      }

      const activeLocation = locations.find((loc) => loc.id === locationId);
      const targetZoom =
        activeLocation && Number.isFinite(activeLocation.serviceRadius)
          ? calculateZoomLevel(activeLocation.serviceRadius)
          : map.getZoom();

      map.easeTo({
        center: marker.getLngLat(),
        zoom: targetZoom,
        duration: 600,
      });
    },
    [locations, mapReady]
  );

  // Geocode locations and add markers/circles when map is ready or locations change
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || locations.length === 0) return;

    const updateMapLayers = async () => {
      try {
        // Import MapLibre for marker creation
        const { default: maplibre } = await import("maplibre-gl");

        // Geocode all locations ONCE and share coordinates between circles and markers
        const geocodePromises = locations
          .filter((loc) => !!loc.city)
          .map(async (loc) => {
            const coords = await geocodeCity(loc.city, loc.province);
            const finalCoords = coords || MANILA_COORDS;
            return { location: loc, coords: finalCoords };
          });

        const geocodedData = await Promise.all(geocodePromises);

        // Create coverage circles using geocoded coordinates
        const features = geocodedData.map(({ coords, location }) => {
          return createCircleGeoJSON(
            coords[1],
            coords[0],
            location.serviceRadius ?? 50
          );
        });

        const circlesCollection = {
          type: "FeatureCollection" as const,
          features,
        };

        // Add or update the source containing all circles
        const source = map.getSource("service-radii");
        if (source) {
          source.setData(circlesCollection as any);
        } else {
          // Add source and layers if they don't exist yet
          map.addSource("service-radii", {
            type: "geojson",
            data: circlesCollection,
          });

          const circleColor = getPrimaryColor();

          // Add fill layer for all circles
          map.addLayer({
            id: "service-radii-fill",
            type: "fill",
            source: "service-radii",
            paint: {
              "fill-color": circleColor,
              "fill-opacity": 0.2,
            },
          });

          // Add outline layer for all circles
          map.addLayer({
            id: "service-radii-outline",
            type: "line",
            source: "service-radii",
            paint: {
              "line-color": circleColor,
              "line-width": 2,
            },
          });
        }

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        // Create markers for all geocoded locations
        geocodedData.forEach(({ location, coords }) => {
          const isPrimary = location.isPrimary;
          // Create marker element
          const markerElement = document.createElement("div");
          markerElement.className = "custom-marker";
          markerElement.style.width = "25px";
          markerElement.style.height = "41px";
          markerElement.style.cursor = "pointer";

          // Primary location: gold/yellow marker, others: blue marker
          const markerColor = isPrimary ? "#F59E0B" : "#3B82F6"; // amber-500 : blue-500
          const markerSvg = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.6 12.5 28.5 12.5 28.5S25 23.1 25 12.5C25 5.6 19.4 0 12.5 0zm0 17.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="${markerColor}"/></svg>`;
          markerElement.style.backgroundImage = `url(data:image/svg+xml;base64,${btoa(
            markerSvg
          )})`;
          markerElement.style.backgroundSize = "contain";

          const marker = new maplibre.Marker({
            element: markerElement,
            anchor: "bottom",
          })
            .setLngLat([coords[1], coords[0]])
            .setPopup(
              new maplibre.Popup({ offset: 25 }).setHTML(
                `<div style="font-size: 14px; padding: 4px;">
                  <strong>${location.city}</strong>
                  ${
                    isPrimary
                      ? '<br/><span style="font-size: 11px; color: #F59E0B;">Primary location</span>'
                      : ""
                  }
                  <br/><span style="font-size: 12px; color: #666;">Radius: ${
                    location.serviceRadius
                  } km</span>
                </div>`
              )
            )
            .addTo(map);

          // Add click handler using ref to avoid recreating markers
          markerElement.addEventListener("click", () => {
            if (onLocationClickRef.current) {
              onLocationClickRef.current(location.id);
            }
          });

          // Store marker reference
          markersRef.current.set(location.id, marker);
        });

        const targetLocationId =
          _activeLocationId ?? primaryLocation?.id ?? null;
        focusOnLocation(targetLocationId);
      } catch (error) {
        console.error("Failed to update map layers:", error);
      }
    };

    updateMapLayers();
    // Only recreate markers when locations content or mapReady changes, NOT when onLocationClick changes
    // Using locationsKey instead of locations array to avoid unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsKey, mapReady]);

  // Focus the map on the active location when it changes
  React.useEffect(() => {
    const targetLocationId = _activeLocationId ?? primaryLocation?.id ?? null;
    focusOnLocation(targetLocationId);
  }, [_activeLocationId, focusOnLocation, primaryLocation?.id]);

  const handleLocationButtonClick = React.useCallback((locationId: string) => {
    if (onLocationClickRef.current) {
      onLocationClickRef.current(locationId);
    }
  }, []);

  const activeLocationButtonId =
    _activeLocationId ?? primaryLocation?.id ?? null;

  if (mapError) {
    return (
      <div className="h-[400px] w-full bg-muted/30 rounded-lg flex items-center justify-center border border-border">
        <p className="text-sm text-muted-foreground">Unable to load map</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative">
      {locations.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
          <div className="flex overflow-x-auto pr-2 pointer-events-auto max-w-full">
            <ToggleGroup
              type="single"
              value={activeLocationButtonId ?? undefined}
              onValueChange={(value) => {
                if (value) {
                  handleLocationButtonClick(value);
                }
              }}
              variant="outline"
              size="sm"
              className="bg-background/90 backdrop-blur-sm border border-border/60"
            >
              {locations.map((location) => {
                const isPrimary = location.isPrimary;
                const isActive = location.id === activeLocationButtonId;

                return (
                  <ToggleGroupItem
                    key={location.id}
                    value={location.id}
                    aria-label={`Select ${location.city}`}
                    className="whitespace-nowrap text-xs"
                  >
                    <span className="flex items-center">
                      <div className="grid">
                        <div className="truncate">
                          {toSentenceCase(location.city)}
                        </div>
                      </div>

                      {isPrimary && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center transition-all duration-200",
                            isActive ? "text-amber-500" : "text-amber-400/80"
                          )}
                        >
                          <Star
                            className={cn(
                              "size-3 transition-all",
                              isActive && "fill-amber-500"
                            )}
                            strokeWidth={2}
                          />
                        </span>
                      )}
                    </span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {(!mapReady || !initialCenterResolved) && (
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
