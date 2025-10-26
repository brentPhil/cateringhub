/**
 * Provider Membership Resolution Utilities
 * Server-side utilities for resolving user membership and calculating role-based capabilities
 */

import { createClient } from '@/lib/supabase/server';
import { APIErrors } from './errors';
import { getAuthenticatedUser } from './auth';
import type { Database } from '@/types/supabase';

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

// Request-level cache to avoid multiple database queries
const membershipCache = new Map<string, CurrentMembership>();

/**
 * Get current user's membership with capabilities
 * Includes request-level caching to avoid redundant database queries
 * 
 * @param providerId - Optional provider ID. If not provided, gets user's first/default provider
 * @returns CurrentMembership object with role and capabilities
 * @throws APIErrors.UNAUTHORIZED if user is not authenticated
 * @throws APIErrors.FORBIDDEN if user has no active membership
 */
export async function getCurrentMembership(
  providerId?: string
): Promise<CurrentMembership> {
  // Get authenticated user
  const user = await getAuthenticatedUser();

  // Check cache first (request-level caching)
  const cacheKey = `${user.id}-${providerId || 'default'}`;
  const cached = membershipCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = await createClient();

  // If providerId is provided, get membership for that specific provider
  if (providerId) {
    const { data: membership, error } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status')
      .eq('provider_id', providerId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error || !membership) {
      throw APIErrors.FORBIDDEN(
        'You are not an active member of this provider organization'
      );
    }

    const result: CurrentMembership = {
      providerId: membership.provider_id,
      userId: membership.user_id,
      role: membership.role,
      status: membership.status,
      capabilities: calculateCapabilities(membership.role),
      memberId: membership.id,
    };

    // Cache the result
    membershipCache.set(cacheKey, result);
    return result;
  }

  // If no providerId provided, get user's first active membership
  const { data: memberships, error: membershipsError } = await supabase
    .from('provider_members')
    .select('id, provider_id, user_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);

  if (membershipsError || !memberships || memberships.length === 0) {
    throw APIErrors.FORBIDDEN(
      'You do not have an active membership in any provider organization'
    );
  }

  const membership = memberships[0];

  const result: CurrentMembership = {
    providerId: membership.provider_id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.status,
    capabilities: calculateCapabilities(membership.role),
    memberId: membership.id,
  };

  // Cache the result
  membershipCache.set(cacheKey, result);
  return result;
}

/**
 * Check if user has required role or higher
 * 
 * @param providerId - Provider ID to check membership in
 * @param minRole - Minimum required role
 * @returns CurrentMembership if authorized
 * @throws APIErrors.FORBIDDEN if user doesn't have required role
 */
export async function requireRole(
  providerId: string,
  minRole: ProviderRole
): Promise<CurrentMembership> {
  const membership = await getCurrentMembership(providerId);

  const roleHierarchy: Record<ProviderRole, number> = {
    owner: 1,
    admin: 2,
    manager: 3,
    staff: 4,
    viewer: 5,
  };

  if (roleHierarchy[membership.role] > roleHierarchy[minRole]) {
    throw APIErrors.FORBIDDEN(
      `This action requires ${minRole} role or higher. You have ${membership.role} role.`
    );
  }

  return membership;
}

/**
 * Check if user has specific capability
 * 
 * @param providerId - Provider ID to check membership in
 * @param capability - Capability key to check
 * @returns CurrentMembership if authorized
 * @throws APIErrors.FORBIDDEN if user doesn't have the capability
 */
export async function requireCapability(
  providerId: string,
  capability: keyof MembershipCapabilities
): Promise<CurrentMembership> {
  const membership = await getCurrentMembership(providerId);

  if (!membership.capabilities[capability]) {
    throw APIErrors.FORBIDDEN(
      `You do not have permission to perform this action. Required capability: ${capability}`
    );
  }

  return membership;
}

/**
 * Clear membership cache (useful for testing or after membership changes)
 */
export function clearMembershipCache(): void {
  membershipCache.clear();
}

/**
 * Require user to be an active member with one of the allowed roles
 * This is a reusable helper for API endpoints that need role-based authorization
 *
 * @param providerId - Provider ID to check membership in
 * @param allowedRoles - Array of roles that are allowed to perform the action
 * @returns CurrentMembership if authorized
 * @throws APIErrors.UNAUTHORIZED if user is not authenticated
 * @throws APIErrors.FORBIDDEN if user doesn't have required role or is not active
 *
 * @example
 * // Require admin or owner role
 * const membership = await requireMembership(providerId, ['owner', 'admin']);
 *
 * // Require manager or higher
 * const membership = await requireMembership(providerId, ['owner', 'admin', 'manager']);
 */
export async function requireMembership(
  providerId: string,
  allowedRoles: ProviderRole[]
): Promise<CurrentMembership> {
  const membership = await getCurrentMembership(providerId);

  // Check if user's role is in the allowed roles list
  if (!allowedRoles.includes(membership.role)) {
    throw APIErrors.FORBIDDEN(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}. You have ${membership.role} role.`
    );
  }

  return membership;
}

