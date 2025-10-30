"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type ProviderRole = Database['public']['Enums']['provider_role'];
type MemberStatus = Database['public']['Enums']['provider_member_status'];

export interface MembershipCapabilities {
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canManageRoles: boolean;
  canViewAllBookings: boolean;
  canEditAllBookings: boolean;
  canAssignBookings: boolean;
  canViewAnalytics: boolean;
  canManageBilling: boolean;
  canManagePayouts: boolean;
  canEditProviderSettings: boolean;
}

export interface CurrentMembership {
  providerId: string;
  userId: string;
  role: ProviderRole;
  status: MemberStatus;
  capabilities: MembershipCapabilities;
  memberId: string;
  teamId: string | null;
}

/**
 * Calculate capabilities based on role
 */
function calculateCapabilities(role: ProviderRole): MembershipCapabilities {
  const roleHierarchy: Record<ProviderRole, number> = {
    owner: 1,
    admin: 2,
    manager: 3,
    staff: 4,
    viewer: 5,
  };

  const roleLevel = roleHierarchy[role];

  return {
    // Team management capabilities
    canInviteMembers: roleLevel <= roleHierarchy.admin, // owner, admin
    canRemoveMembers: roleLevel <= roleHierarchy.admin, // owner, admin
    canManageRoles: roleLevel <= roleHierarchy.admin, // owner, admin

    // Booking capabilities
    canViewAllBookings: roleLevel <= roleHierarchy.manager, // owner, admin, manager
    canEditAllBookings: roleLevel <= roleHierarchy.manager, // owner, admin, manager
    canAssignBookings: roleLevel <= roleHierarchy.manager, // owner, admin, manager

    // Analytics and financial capabilities
    canViewAnalytics: roleLevel <= roleHierarchy.admin, // owner, admin
    canManageBilling: roleLevel <= roleHierarchy.admin, // owner, admin
    canManagePayouts: roleLevel <= roleHierarchy.admin, // owner, admin
    canEditProviderSettings: roleLevel <= roleHierarchy.admin, // owner, admin
  };
}

// Query keys
export const membershipKeys = {
  all: ['membership'] as const,
  current: (userId: string | undefined) => [...membershipKeys.all, 'current', userId] as const,
  provider: (providerId: string | undefined) => [...membershipKeys.all, 'provider', providerId] as const,
};

/**
 * Hook to get current user's membership
 * Fetches the user's active membership and calculates capabilities
 * 
 * @param providerId - Optional provider ID. If not provided, gets user's first/default provider
 */
export function useCurrentMembership(providerId?: string) {
  const supabase = createClient();

  return useQuery<CurrentMembership | null>({
    queryKey: providerId 
      ? membershipKeys.provider(providerId)
      : membershipKeys.current('default'),
    queryFn: async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return null;
      }

      // If providerId is provided, get membership for that specific provider
      if (providerId) {
        const { data: membership, error } = await supabase
          .from('provider_members')
          .select('id, provider_id, user_id, role, status, team_id')
          .eq('provider_id', providerId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error || !membership) {
          return null;
        }

        return {
          providerId: membership.provider_id,
          userId: membership.user_id,
          role: membership.role,
          status: membership.status,
          capabilities: calculateCapabilities(membership.role),
          memberId: membership.id,
          teamId: membership.team_id,
        };
      }

      // If no providerId provided, get user's first active membership
      const { data: memberships, error: membershipsError } = await supabase
        .from('provider_members')
        .select('id, provider_id, user_id, role, status, team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1);

      if (membershipsError || !memberships || memberships.length === 0) {
        return null;
      }

      const membership = memberships[0];

      return {
        providerId: membership.provider_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status,
        capabilities: calculateCapabilities(membership.role),
        memberId: membership.id,
        teamId: membership.team_id,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to check if user has specific role(s)
 * 
 * @param roles - Single role or array of allowed roles
 * @param providerId - Optional provider ID
 * @returns boolean indicating if user has one of the allowed roles
 */
export function useHasRole(
  roles: ProviderRole | ProviderRole[],
  providerId?: string
): boolean {
  const { data: membership } = useCurrentMembership(providerId);

  if (!membership) return false;

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(membership.role);
}

/**
 * Hook to check if user has specific capability
 * 
 * @param capability - Capability key to check
 * @param providerId - Optional provider ID
 * @returns boolean indicating if user has the capability
 */
export function useHasCapability(
  capability: keyof MembershipCapabilities,
  providerId?: string
): boolean {
  const { data: membership } = useCurrentMembership(providerId);

  if (!membership) return false;

  return membership.capabilities[capability];
}

