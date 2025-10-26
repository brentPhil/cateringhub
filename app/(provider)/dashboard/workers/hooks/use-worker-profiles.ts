"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tables, Json } from "@/types/supabase";
import {
  createWorkerProfile as createWorkerProfileAction,
  updateWorkerProfile as updateWorkerProfileAction,
  deleteWorkerProfile as deleteWorkerProfileAction,
} from "../actions/worker-profiles";

// Types
export type WorkerProfile = Tables<"worker_profiles">;

export type WorkerProfileWithStats = WorkerProfile & {
  shift_count?: number;
  total_hours?: number;
};

// Query keys
export const workerProfilesKeys = {
  all: ["worker-profiles"] as const,
  lists: () => [...workerProfilesKeys.all, "list"] as const,
  list: (providerId: string, filters?: WorkerProfileFilters) =>
    [...workerProfilesKeys.lists(), providerId, filters] as const,
  detail: (workerId: string) =>
    [...workerProfilesKeys.all, "detail", workerId] as const,
};

// Filter types
export interface WorkerProfileFilters {
  status?: "active" | "inactive";
  role?: string;
  tags?: string[];
  search?: string;
}

/**
 * Hook to fetch worker profiles for a provider
 */
export function useWorkerProfiles(
  providerId: string | undefined,
  filters?: WorkerProfileFilters
) {
  const supabase = createClient();

  return useQuery<WorkerProfile[]>({
    queryKey: workerProfilesKeys.list(providerId || "", filters),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      console.log("[useWorkerProfiles] Fetching workers for provider:", providerId);

      // Build query
      let query = supabase
        .from("worker_profiles")
        .select("*")
        .eq("provider_id", providerId)
        .order("name", { ascending: true });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.role) {
        query = query.eq("role", filters.role);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains("tags", filters.tags);
      }

      if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data: workers, error } = await query;

      if (error) {
        console.error("[useWorkerProfiles] Error fetching workers:", error);
        throw error;
      }

      console.log("[useWorkerProfiles] Fetched workers:", workers);

      return workers || [];
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch a single worker profile
 */
export function useWorkerProfile(workerId: string | undefined) {
  const supabase = createClient();

  return useQuery<WorkerProfile>({
    queryKey: workerProfilesKeys.detail(workerId || ""),
    queryFn: async () => {
      if (!workerId) throw new Error("Worker ID is required");

      console.log("[useWorkerProfile] Fetching worker:", workerId);

      const { data: worker, error } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("id", workerId)
        .single();

      if (error) {
        console.error("[useWorkerProfile] Error fetching worker:", error);
        throw error;
      }

      console.log("[useWorkerProfile] Fetched worker:", worker);

      return worker;
    },
    enabled: !!workerId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new worker profile
 */
export function useCreateWorkerProfile(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      phone?: string;
      role?: string;
      tags?: string[];
      certifications?: string[];
      hourlyRate?: number;
      availability?: Json;
      notes?: string;
      status?: "active" | "inactive";
    }) => {
      const result = await createWorkerProfileAction({
        providerId,
        ...params,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create worker profile");
      }

      return result.data;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: workerProfilesKeys.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create worker profile"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workerProfilesKeys.lists(),
      });
      toast.success("Worker profile created successfully");
    },
  });
}

/**
 * Hook to update a worker profile
 */
export function useUpdateWorkerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workerId: string;
      name?: string;
      phone?: string;
      role?: string;
      tags?: string[];
      certifications?: string[];
      hourlyRate?: number;
      availability?: Json;
      notes?: string;
      status?: "active" | "inactive";
    }) => {
      const result = await updateWorkerProfileAction(params);

      if (!result.success) {
        throw new Error(result.error || "Failed to update worker profile");
      }

      return result.data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: workerProfilesKeys.detail(variables.workerId),
      });
      await queryClient.cancelQueries({
        queryKey: workerProfilesKeys.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update worker profile"
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workerProfilesKeys.detail(variables.workerId),
      });
      queryClient.invalidateQueries({
        queryKey: workerProfilesKeys.lists(),
      });
      toast.success("Worker profile updated successfully");
    },
  });
}

/**
 * Hook to delete a worker profile
 */
export function useDeleteWorkerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const result = await deleteWorkerProfileAction(workerId);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete worker profile");
      }

      return result.data;
    },
    onMutate: async (workerId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: workerProfilesKeys.detail(workerId),
      });
      await queryClient.cancelQueries({
        queryKey: workerProfilesKeys.lists(),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete worker profile"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workerProfilesKeys.lists(),
      });
      toast.success("Worker profile deleted successfully");
    },
  });
}

/**
 * Hook to get available roles from existing worker profiles
 */
export function useWorkerRoles(providerId: string | undefined) {
  const supabase = createClient();

  return useQuery<string[]>({
    queryKey: [...workerProfilesKeys.lists(), providerId, "roles"],
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const { data: workers, error } = await supabase
        .from("worker_profiles")
        .select("role")
        .eq("provider_id", providerId)
        .not("role", "is", null);

      if (error) {
        console.error("[useWorkerRoles] Error fetching roles:", error);
        throw error;
      }

      // Extract unique roles
      const roles = Array.from(
        new Set(workers.map((w) => w.role).filter(Boolean) as string[])
      ).sort();

      return roles;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get available tags from existing worker profiles
 */
export function useWorkerTags(providerId: string | undefined) {
  const supabase = createClient();

  return useQuery<string[]>({
    queryKey: [...workerProfilesKeys.lists(), providerId, "tags"],
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const { data: workers, error } = await supabase
        .from("worker_profiles")
        .select("tags")
        .eq("provider_id", providerId);

      if (error) {
        console.error("[useWorkerTags] Error fetching tags:", error);
        throw error;
      }

      // Extract unique tags
      const allTags = workers.flatMap((w) => w.tags || []);
      const uniqueTags = Array.from(new Set(allTags)).sort();

      return uniqueTags;
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

