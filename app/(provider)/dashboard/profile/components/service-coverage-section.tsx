"use client";

import * as React from "react";
import { ServiceMap, type MapLocation } from "./service-map";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ServiceCoverageSectionProps {
  locations: MapLocation[];
  activeLocationId: string | null;
  onActiveLocationChange: (locationId: string) => void;
  coveredCities: string[];
  onRadiusChange: (value: number) => void;
  isLoading?: boolean;
  max?: number;
}

export function ServiceCoverageSection({
  locations,
  activeLocationId,
  onActiveLocationChange,
  coveredCities,
  onRadiusChange,
  isLoading,
  max,
}: ServiceCoverageSectionProps) {
  // Get active location or fallback to first location
  const activeLocation =
    locations.find((loc) => loc.id === activeLocationId) || locations[0];
  const radius = activeLocation?.serviceRadius ?? 50;
  return (
    <section>
      {isLoading ? (
        <Skeleton className="h-6 w-56 mb-6" />
      ) : (
        <h2 className="text-xl font-semibold mb-6">Service coverage area</h2>
      )}

      <div className="space-y-6">
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
                max={max ?? 100}
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

        {/* Map */}
        <ServiceMap
          locations={locations}
          activeLocationId={activeLocationId}
          onLocationClick={onActiveLocationChange}
          isLoading={isLoading}
        />

        {/* Covered Cities */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-64" />
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-full mt-2" />
              <Skeleton className="h-3 w-full" />
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                Cities/areas in your service range:
              </p>
              <div className="flex flex-wrap gap-2">
                {coveredCities.length > 0 ? (
                  coveredCities.map((city) => (
                    <span
                      key={city}
                      className="px-3 py-1 rounded-full text-sm border border-primary text-primary bg-primary/5"
                    >
                      {city}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No cities specified. Adjust your service radius to cover
                    more areas.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Map shows approximate coverage based on your selected city and
                service radius.
              </p>
              <p className="text-xs text-muted-foreground">
                * Actual service areas may vary based on traffic and
                accessibility.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
