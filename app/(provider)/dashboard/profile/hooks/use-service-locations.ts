"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Tables } from "@/types/supabase";

type DBServiceLocation = Tables<"service_locations">;

export interface ServiceLocationFormData {
  id: string;
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  postalCode: string;
  isPrimary: boolean;
  landmark: string;
  notes: string;
  serviceRadius: number; // km
}

/**
 * Hook to manage service locations state in the profile form
 * Handles adding, updating, removing, and validating locations
 */
export function useServiceLocations(initialLocations?: DBServiceLocation[]) {
  // --- Simple, predictable state model ---
  // 1) Initial baseline from server, stored in a ref
  // 2) Local editable state
  // 3) No automatic re-syncs; only explicit sync after save

  // Pure transformation function
  const convertToFormData = useCallback(
    (locations: DBServiceLocation[]): ServiceLocationFormData[] =>
      locations.map((loc) => ({
        id: loc.id,
        province: loc.province || "",
        city: loc.city || "",
        barangay: loc.barangay || "",
        streetAddress: loc.street_address || "",
        postalCode: loc.postal_code || "",
        isPrimary: loc.is_primary,
        landmark: loc.landmark || "",
        notes: loc.service_area_notes || "",
        serviceRadius: (loc as any).service_radius ?? 50,
      })),
    []
  );

  // Baseline reference (what came from server most recently)
  const initialRef = useRef<ServiceLocationFormData[] | null>(null);
  // Flag indicates whether baseline has been hydrated from server at least once
  const hydratedFromServer = useRef(false);

  // Local editable state
  const [locations, setLocations] = useState<ServiceLocationFormData[]>(() => {
    // If we already have server locations at first render, use them; otherwise one default row
    if (initialLocations && initialLocations.length > 0) {
      const converted = convertToFormData(initialLocations);
      initialRef.current = JSON.parse(JSON.stringify(converted));
      hydratedFromServer.current = true;
      return converted;
    }
    const def = [{
      id: crypto.randomUUID(),
      province: "",
      city: "",
      barangay: "",
      streetAddress: "",
      postalCode: "",
      isPrimary: true,
      landmark: "",
      notes: "",
      serviceRadius: 50,
    }];
    initialRef.current = JSON.parse(JSON.stringify(def));
    // not hydrated from server yet
    hydratedFromServer.current = false;
    return def;
  });

  // One-time hydration when server data arrives later (e.g., after fetch)
  useEffect(() => {
    if (!hydratedFromServer.current && initialLocations && initialLocations.length > 0) {
      const converted = convertToFormData(initialLocations);
      initialRef.current = JSON.parse(JSON.stringify(converted));
      setLocations(converted);
      hydratedFromServer.current = true;
    }
  }, [initialLocations, convertToFormData]);

  /**
   * Add a new empty location
   */
  const addLocation = useCallback(() => {
    const newLocation: ServiceLocationFormData = {
      id: crypto.randomUUID(),
      province: "",
      city: "",
      barangay: "",
      streetAddress: "",
      postalCode: "",
      isPrimary: false, // New locations are not primary by default
      landmark: "",
      notes: "",
      serviceRadius: 50,
    };
    setLocations((prev) => [...prev, newLocation]);
  }, []);

  /**
   * Remove a location by ID
   * Prevents removing if only one location remains
   */
  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => {
      // Don't allow removing if only one location
      if (prev.length <= 1) {
        console.warn("Cannot remove the last location");
        return prev;
      }

      const filtered = prev.filter((loc) => loc.id !== id);

      // If we removed the primary location, make the first remaining location primary
      const hadPrimary = prev.find((loc) => loc.id === id)?.isPrimary;
      if (hadPrimary && filtered.length > 0) {
        filtered[0].isPrimary = true;
      }

      return filtered;
    });
  }, []);

  /**
   * Update a specific field of a location
   */
  const updateLocation = useCallback((id: string, field: keyof ServiceLocationFormData, value: any) => {
    setLocations((prev) => {
      if (field === "isPrimary" && value === true) {
        return prev.map((l) => ({ ...l, isPrimary: l.id === id }));
      }
      return prev.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc));
    });
  }, []);

  /**
   * Set a location as primary (and unset all others)
   */
  const setPrimaryLocation = useCallback((id: string) => {
    setLocations((prev) =>
      prev.map((loc) => ({
        ...loc,
        isPrimary: loc.id === id,
      }))
    );
  }, []);

  /**
   * Reset locations to initial state
   */
  const resetLocations = useCallback(() => {
    const baseline = initialRef.current ?? [];
    setLocations(JSON.parse(JSON.stringify(baseline)));
  }, []);

  /**
   * Sync locations from server (e.g., after fetch or save)
   */
  const syncFromServer = useCallback(
    (serverLocations: DBServiceLocation[] | undefined | null) => {
      if (serverLocations && serverLocations.length > 0) {
        const converted = convertToFormData(serverLocations);
        initialRef.current = JSON.parse(JSON.stringify(converted));
        setLocations(converted);
      }
    },
    [convertToFormData]
  );

  /**
   * Validate locations
   * Returns array of error messages (empty if valid)
   */
  const validateLocations = useCallback((): string[] => {
    const errors: string[] = [];

    if (locations.length === 0) {
      errors.push("At least one service location is required");
      return errors;
    }

    // Check primary location constraints
    const primaryCount = locations.filter((loc) => loc.isPrimary).length;
    if (primaryCount === 0) {
      errors.push("At least one location must be marked as primary");
    } else if (primaryCount > 1) {
      errors.push("Only one location can be marked as primary");
    }

    // Validate each location
    locations.forEach((loc, index) => {
      if (!loc.province) {
        errors.push(`Location ${index + 1}: Province is required`);
      }
      if (!loc.city) {
        errors.push(`Location ${index + 1}: City is required`);
      }
      if (!loc.barangay) {
        errors.push(`Location ${index + 1}: Barangay is required`);
      }
    });

    return errors;
  }, [locations]);

  /**
   * Check if locations have been modified from initial state
   */
  const isDirty = useCallback((): boolean => {
    const baseline = initialRef.current ?? [];
    if (locations.length !== baseline.length) return true;

    return locations.some((loc, index) => {
      const initial = baseline[index];
      if (!initial) return true;
      return (
        loc.province !== initial.province ||
        loc.city !== initial.city ||
        loc.barangay !== initial.barangay ||
        loc.streetAddress !== initial.streetAddress ||
        loc.postalCode !== initial.postalCode ||
        loc.isPrimary !== initial.isPrimary ||
        loc.landmark !== initial.landmark ||
        loc.notes !== initial.notes ||
        loc.serviceRadius !== initial.serviceRadius
      );
    });
  }, [locations]);

  return {
    locations,
    addLocation,
    removeLocation,
    updateLocation,
    setPrimaryLocation,
    resetLocations,
    validateLocations,
    isDirty,
    syncFromServer,
  };
}

