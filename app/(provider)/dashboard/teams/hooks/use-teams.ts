"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables, Enums } from "@/types/supabase";

// Types
export type Team = Tables<"teams"> & {
  service_location?: {
    id: string;
    province: string | null;
    city: string | null;
    barangay: string | null;
    is_primary: boolean;
  };
  member_count?: number;
};

export type TeamWithMembers = Team & {
  members?: Array<{
    id: string;
    user_id: string;
    role: Enums<"provider_role">;
    status: Enums<"provider_member_status">;
    full_name: string;
    email: string;
    avatar_url?: string;
  }>;
};

// Team member type (unified staff + workers)
export type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  status: string;
  member_type: "staff" | "worker";
  email?: string | null;
  phone?: string | null;
  hourly_rate?: number | null;
  tags?: string[] | null;
};

export type TeamMembersResponse = {
  members: TeamMember[];
  team: {
    id: string;
    name: string;
  };
  counts: {
    total: number;
    staff: number;
    workers: number;
  };
};

// Query keys
export const teamsKeys = {
  all: ["teams"] as const,
  lists: () => [...teamsKeys.all, "list"] as const,
  list: (providerId: string, filters?: { status?: string; service_location_id?: string }) =>
    [...teamsKeys.lists(), providerId, filters] as const,
  details: () => [...teamsKeys.all, "detail"] as const,
  detail: (providerId: string, teamId: string) =>
    [...teamsKeys.details(), providerId, teamId] as const,
  members: (providerId: string, teamId: string) =>
    [...teamsKeys.all, "members", providerId, teamId] as const,
};

/**
 * Hook to fetch all teams for a provider
 */
export function useTeams(
  providerId: string | undefined,
  filters?: { status?: string; service_location_id?: string }
) {
  return useQuery<Team[]>({
    queryKey: teamsKeys.list(providerId || "", filters),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.service_location_id) params.append("service_location_id", filters.service_location_id);

      const url = `/api/providers/${providerId}/teams${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch teams");
      }

      const { data } = await response.json();
      return data || [];
    },
    enabled: !!providerId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch a single team with members
 */
export function useTeam(providerId: string | undefined, teamId: string | undefined) {
  return useQuery<TeamWithMembers>({
    queryKey: teamsKeys.detail(providerId || "", teamId || ""),
    queryFn: async () => {
      if (!providerId || !teamId) throw new Error("Provider ID and Team ID are required");

      const response = await fetch(`/api/providers/${providerId}/teams/${teamId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch team");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!providerId && !!teamId,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new team
 */
export function useCreateTeam(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      service_location_id: string;
      name: string;
      description?: string;
      daily_capacity?: number;
      max_concurrent_events?: number;
      supervisor_member_id: string;
    }) => {
      const response = await fetch(`/api/providers/${providerId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create team");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success(`Team "${data.data.name}" created successfully`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    },
  });
}

/**
 * Hook to update a team
 */
export function useUpdateTeam(providerId: string, teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name?: string;
      description?: string;
      daily_capacity?: number;
      max_concurrent_events?: number;
      status?: Enums<"team_status">;
    }) => {
      const response = await fetch(`/api/providers/${providerId}/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update team");
      }

      return response.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: teamsKeys.detail(providerId, teamId) });

      const previousTeam = queryClient.getQueryData(teamsKeys.detail(providerId, teamId));

      // Optimistically update team
      queryClient.setQueryData<TeamWithMembers>(
        teamsKeys.detail(providerId, teamId),
        (old) => (old ? { ...old, ...newData } : old)
      );

      return { previousTeam };
    },
    onError: (error, _variables, context) => {
      if (context?.previousTeam) {
        queryClient.setQueryData(teamsKeys.detail(providerId, teamId), context.previousTeam);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update team");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teamsKeys.detail(providerId, teamId) });
      toast.success(data.message || "Team updated successfully");
    },
  });
}

/**
 * Hook to archive a team
 */
export function useArchiveTeam(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const response = await fetch(`/api/providers/${providerId}/teams/${teamId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to archive team");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success(data.message || "Team archived successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive team");
    },
  });
}

/**
 * Hook to permanently delete a team
 */
export function useDeleteTeam(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const response = await fetch(`/api/providers/${providerId}/teams/${teamId}?permanent=1`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete team");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      toast.success(data.message || "Team deleted successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete team");
    },
  });
}

/**
 * Hook to assign a member to a team
 */
export function useAssignMemberToTeam(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, teamId }: { memberId: string; teamId: string | null }) => {
      const response = await fetch(`/api/providers/${providerId}/members/${memberId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to assign member to team");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate both teams and members queries
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
      if (variables.teamId) {
        queryClient.invalidateQueries({ queryKey: teamsKeys.detail(providerId, variables.teamId) });
        queryClient.invalidateQueries({ queryKey: teamsKeys.members(providerId, variables.teamId) });
      }
      // Legacy key invalidation retained for backward-compatibility
      queryClient.invalidateQueries({ queryKey: ["team", "members", providerId] });
      toast.success(data.message || "Member assigned successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to assign member");
    },
  });
}

/**
 * Hook to fetch all members (staff + workers) assigned to a team
 */
export function useTeamMembers(providerId: string | undefined, teamId: string | undefined) {
  return useQuery<TeamMembersResponse>({
    queryKey: teamsKeys.members(providerId || "", teamId || ""),
    queryFn: async () => {
      if (!providerId || !teamId) {
        throw new Error("Provider ID and Team ID are required");
      }

      const response = await fetch(`/api/providers/${providerId}/teams/${teamId}/members`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch team members");
      }

      return response.json();
    },
    enabled: !!providerId && !!teamId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
