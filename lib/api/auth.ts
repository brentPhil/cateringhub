/**
 * API Authentication & Authorization Utilities
 */

import { createClient } from '@/lib/supabase/server';
import { APIErrors } from './errors';
import type { Database } from '@/types/supabase';

type ProviderRole = Database['public']['Enums']['provider_role'];

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Get the authenticated user from the request
 * Throws UNAUTHORIZED error if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw APIErrors.UNAUTHORIZED('You must be logged in to perform this action');
  }

  return {
    id: user.id,
    email: user.email!,
  };
}

/**
 * Check if user has required role in provider
 * Returns the member record if authorized, throws FORBIDDEN error otherwise
 */
export async function requireProviderRole(
  providerId: string,
  userId: string,
  minRole: ProviderRole
): Promise<{
  id: string;
  provider_id: string;
  user_id: string;
  role: ProviderRole;
  status: Database['public']['Enums']['provider_member_status'];
}> {
  const supabase = await createClient();

  // Use the is_provider_member helper function
  const { data: hasPermission, error: permError } = await supabase.rpc(
    'is_provider_member',
    {
      provider_id: providerId,
      user_id: userId,
      min_role: minRole,
    }
  );

  if (permError) {
    console.error('Error checking provider role:', {
      error: permError,
      providerId,
      userId,
      minRole,
      message: permError.message,
      details: permError.details,
      hint: permError.hint,
    });
    throw APIErrors.INTERNAL('Failed to verify permissions');
  }

  if (!hasPermission) {
    throw APIErrors.FORBIDDEN('You do not have permission to perform this action');
  }

  // Get the member record
  const { data: member, error: memberError } = await supabase
    .from('provider_members')
    .select('id, provider_id, user_id, role, status')
    .eq('provider_id', providerId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (memberError || !member) {
    throw APIErrors.FORBIDDEN('You are not an active member of this provider');
  }

  return member;
}

/**
 * Verify provider exists
 * Throws NOT_FOUND error if provider doesn't exist
 */
export async function verifyProviderExists(providerId: string): Promise<void> {
  const supabase = await createClient();

  const { data: provider, error } = await supabase
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .single();

  if (error || !provider) {
    throw APIErrors.NOT_FOUND('Provider');
  }
}

/**
 * Get role hierarchy value (lower number = higher privilege)
 */
export function getRoleHierarchy(role: ProviderRole): number {
  const hierarchy: Record<ProviderRole, number> = {
    owner: 1,
    admin: 2,
    supervisor: 3,
    staff: 4,
    viewer: 5,
  } as const;
  return hierarchy[role];
}

/**
 * Check if role1 has higher or equal privilege than role2
 */
export function hasHigherOrEqualRole(role1: ProviderRole, role2: ProviderRole): boolean {
  return getRoleHierarchy(role1) <= getRoleHierarchy(role2);
}
