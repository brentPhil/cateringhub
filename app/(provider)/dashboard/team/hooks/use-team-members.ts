"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tables, Enums } from "@/types/supabase";

// Types
export type ProviderMember = Tables<"provider_members"> & {
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
};

export type ProviderInvitation = Tables<"provider_invitations">;

export type TeamMemberWithUser = ProviderMember & {
  full_name: string;
  email: string;
  avatar_url?: string;
  last_active?: string;
};

// Query keys
export const teamKeys = {
  all: ["team"] as const,
  members: (providerId: string) => ["team", "members", providerId] as const,
  member: (providerId: string, memberId: string) => ["team", "member", providerId, memberId] as const,
  invitations: (providerId: string) => ["team", "invitations", providerId] as const,
};

/**
 * Hook to fetch team members for a provider
 */
export function useTeamMembers(providerId: string | undefined) {
  return useQuery<TeamMemberWithUser[]>({
    queryKey: teamKeys.members(providerId || ""),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      // Fetch members with user data via API endpoint
      const response = await fetch(`/api/providers/${providerId}/members`, {
        // Prevent caching to ensure fresh data
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch team members");
      }

      const { data } = await response.json();

      // Filter out any temporary optimistic updates (IDs starting with "temp-")
      const realMembers = (data || []).filter((member: TeamMemberWithUser) =>
        !member.id.startsWith('temp-')
      );

      return realMembers;
    },
    enabled: !!providerId,
    staleTime: 10 * 1000, // 10 seconds (reduced from 30)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
  });
}

/**
 * Hook to fetch pending invitations for a provider
 */
export function useTeamInvitations(providerId: string | undefined) {
  const supabase = createClient();

  return useQuery<ProviderInvitation[]>({
    queryKey: teamKeys.invitations(providerId || ""),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const { data, error } = await supabase
        .from("provider_invitations")
        .select("*")
        .eq("provider_id", providerId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to invite a new team member
 */
export function useInviteMember(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      if (!providerId) {
        throw new Error("Provider ID is required to send invitations");
      }

      const response = await fetch(`/api/providers/${providerId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to send invitation");
      }

      return response.json();
    },
    onMutate: async (newInvitation) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamKeys.invitations(providerId) });

      // Snapshot previous value
      const previousInvitations = queryClient.getQueryData(teamKeys.invitations(providerId));

      // Optimistically add pending invitation
      queryClient.setQueryData<ProviderInvitation[]>(
        teamKeys.invitations(providerId),
        (old = []) => [
          {
            id: `temp-${Date.now()}`,
            provider_id: providerId,
            email: newInvitation.email,
            role: newInvitation.role as Enums<"provider_role">,
            invited_by: "temp-user-id", // Temporary value for optimistic update
            token: "",
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            accepted_at: null,
            updated_at: new Date().toISOString(),
          },
          ...old,
        ]
      );

      return { previousInvitations };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvitations) {
        queryClient.setQueryData(teamKeys.invitations(providerId), context.previousInvitations);
      }
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(providerId) });
      toast.success(`Invitation sent to ${data.data.email}`);
    },
  });
}

/**
 * Hook to suspend or activate a team member
 */
export function useUpdateMemberStatus(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: "active" | "suspended" }) => {
      const response = await fetch(`/api/providers/${providerId}/members/${memberId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update member status");
      }

      return response.json();
    },
    onMutate: async ({ memberId, status }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members(providerId) });

      const previousMembers = queryClient.getQueryData(teamKeys.members(providerId));

      // Optimistically update member status
      queryClient.setQueryData<TeamMemberWithUser[]>(
        teamKeys.members(providerId),
        (old = []) =>
          old.map((member) =>
            member.id === memberId ? { ...member, status } : member
          )
      );

      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.members(providerId), context.previousMembers);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update member status");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
      toast.success(data.message);
    },
  });
}

/**
 * Hook to remove a team member
 */
export function useRemoveMember(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/providers/${providerId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to remove member");
      }

      return response.json();
    },
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members(providerId) });

      const previousMembers = queryClient.getQueryData(teamKeys.members(providerId));

      // Optimistically remove member
      queryClient.setQueryData<TeamMemberWithUser[]>(
        teamKeys.members(providerId),
        (old = []) => old.filter((member) => member.id !== memberId)
      );

      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.members(providerId), context.previousMembers);
      }
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
      toast.success(data.message);
    },
  });
}

/**
 * Hook to resend an invitation
 */
export function useResendInvitation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(
        `/api/providers/${providerId}/invitations/${invitationId}/resend`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to resend invitation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(providerId) });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
    },
  });
}

/**
 * Hook to resend password setup link for admin-created members
 */
export function useResendPasswordLink(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(
        `/api/providers/${providerId}/members/${memberId}/resend-password-link`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to resend password setup link");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to resend password setup link");
    },
  });
}

/**
 * Hook to update a team member's role
 */
export function useUpdateMemberRole(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await fetch(`/api/providers/${providerId}/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update member role");
      }

      return response.json();
    },
    onMutate: async ({ memberId, role }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members(providerId) });

      const previousMembers = queryClient.getQueryData(teamKeys.members(providerId));

      // Optimistically update member role
      queryClient.setQueryData<TeamMemberWithUser[]>(
        teamKeys.members(providerId),
        (old = []) =>
          old.map((member) =>
            member.id === memberId ? { ...member, role: role as Enums<"provider_role"> } : member
          )
      );

      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.members(providerId), context.previousMembers);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update member role");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
      toast.success(data.message || "Member role updated successfully");
    },
  });
}

/**
 * Hook to add staff manually (admin-created flow)
 */
export function useAddStaff(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; full_name: string; role: string }) => {
      if (!providerId) {
        throw new Error("Provider ID is required to add staff");
      }

      const response = await fetch(`/api/providers/${providerId}/team/admin-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to add staff member");
      }

      return response.json();
    },
    onMutate: async (newStaff) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamKeys.members(providerId) });

      // Snapshot previous value
      const previousMembers = queryClient.getQueryData(teamKeys.members(providerId));

      // Optimistically add pending member
      queryClient.setQueryData<TeamMemberWithUser[]>(
        teamKeys.members(providerId),
        (old = []) => [
          {
            id: `temp-${Date.now()}`,
            provider_id: providerId,
            user_id: `temp-user-${Date.now()}`,
            role: newStaff.role as Enums<"provider_role">,
            status: "pending" as const,
            invitation_method: "admin_created" as const,
            invited_by: "temp-inviter-id",
            invited_at: new Date().toISOString(),
            joined_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            first_login_at: null,
            full_name: newStaff.full_name,
            email: newStaff.email,
            avatar_url: undefined,
            last_active: undefined,
          },
          ...old,
        ]
      );

      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.members(providerId), context.previousMembers);
      }
      toast.error(error instanceof Error ? error.message : "Failed to add staff member");
    },
    onSuccess: async (data) => {
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
      toast.success(data.message || "Staff member added successfully");
    },
    onSettled: () => {
      // Always refetch after mutation completes (success or error)
      // This ensures temporary optimistic data is replaced with real data
      queryClient.invalidateQueries({ queryKey: teamKeys.members(providerId) });
    },
  });
}

