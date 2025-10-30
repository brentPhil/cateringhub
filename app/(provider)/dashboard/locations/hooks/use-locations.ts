"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/types/supabase";

export type ServiceLocation = Tables<"service_locations">;

// Query keys
export const locationsKeys = {
  all: ["locations"] as const,
  lists: () => [...locationsKeys.all, "list"] as const,
  list: (providerId: string) => [...locationsKeys.lists(), providerId] as const,
  details: () => [...locationsKeys.all, "detail"] as const,
  detail: (providerId: string, locationId: string) =>
    [...locationsKeys.details(), providerId, locationId] as const,
};

/**
 * Fetch all service locations for a provider
 */
export function useLocations(providerId: string | undefined) {
  return useQuery({
    queryKey: locationsKeys.list(providerId || ""),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const response = await fetch(`/api/providers/${providerId}/locations`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch locations");
      }
      return response.json() as Promise<ServiceLocation[]>;
    },
    enabled: !!providerId,
  });
}

/**
 * Create a new service location
 */
export function useCreateLocation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      province: string;
      city: string;
      barangay: string;
      street_address?: string;
      postal_code?: string;
      landmark?: string;
      service_area_notes?: string;
      service_radius?: number;
      is_primary?: boolean;
      daily_capacity?: number;
      max_concurrent_events?: number;
    }) => {
      const response = await fetch(`/api/providers/${providerId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create location");
      }

      return response.json() as Promise<ServiceLocation>;
    },
    onSuccess: (newLocation) => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationsKeys.list(providerId) });
      
      toast.success("Location created", {
        description: `${newLocation.city}, ${newLocation.province} has been added.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to create location", {
        description: error.message,
      });
    },
  });
}

/**
 * Update a service location
 */
export function useUpdateLocation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      data,
    }: {
      locationId: string;
      data: Partial<{
        province: string;
        city: string;
        barangay: string;
        street_address: string;
        postal_code: string;
        landmark: string;
        service_area_notes: string;
        service_radius: number;
        is_primary: boolean;
        daily_capacity: number;
        max_concurrent_events: number;
      }>;
    }) => {
      const response = await fetch(
        `/api/providers/${providerId}/locations/${locationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update location");
      }

      return response.json() as Promise<ServiceLocation>;
    },
    onSuccess: (updatedLocation) => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationsKeys.list(providerId) });
      
      toast.success("Location updated", {
        description: `${updatedLocation.city}, ${updatedLocation.province} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to update location", {
        description: error.message,
      });
    },
  });
}

/**
 * Delete a service location
 */
export function useDeleteLocation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const response = await fetch(
        `/api/providers/${providerId}/locations/${locationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete location");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationsKeys.list(providerId) });
      
      toast.success("Location deleted", {
        description: "The service location has been removed.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete location", {
        description: error.message,
      });
    },
  });
}

/**
 * Set a location as primary
 */
export function useSetPrimaryLocation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const response = await fetch(
        `/api/providers/${providerId}/locations/${locationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_primary: true }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set primary location");
      }

      return response.json() as Promise<ServiceLocation>;
    },
    onSuccess: (updatedLocation) => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationsKeys.list(providerId) });
      
      toast.success("Primary location updated", {
        description: `${updatedLocation.city}, ${updatedLocation.province} is now the primary location.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to set primary location", {
        description: error.message,
      });
    },
  });
}

