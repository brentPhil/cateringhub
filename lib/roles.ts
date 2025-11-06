import { z } from "zod";
import type { Database } from "@/types/supabase";

// Type alias sourced from Supabase generated types
export type ProviderRole = Database["public"]["Enums"]["provider_role"];

// Single source of truth for role values at runtime
export const PROVIDER_ROLE_VALUES = [
  "owner",
  "admin",
  "supervisor",
  "staff",
  "viewer",
] as const satisfies readonly ProviderRole[];

// Roles that can be assigned via invite/add-staff (excludes owner)
export const INVITABLE_ROLE_VALUES = [
  "admin",
  "supervisor",
  "staff",
  "viewer",
] as const satisfies readonly Exclude<ProviderRole, "owner">[];

// Zod schemas built from the single source arrays
export const ProviderRoleSchema = z.enum([...PROVIDER_ROLE_VALUES] as [
  ...typeof PROVIDER_ROLE_VALUES,
]);
export const InvitableRoleSchema = z.enum([...INVITABLE_ROLE_VALUES] as [
  ...typeof INVITABLE_ROLE_VALUES,
]);

// Legacy mapping (temporary shim): map 'manager' -> 'supervisor'
export function mapLegacyProviderRole(role: string): ProviderRole | null {
  const normalized = role.trim().toLowerCase();
  const mapped = normalized === "manager" ? "supervisor" : normalized;
  if ((PROVIDER_ROLE_VALUES as readonly string[]).includes(mapped)) {
    return mapped as ProviderRole;
  }
  return null;
}

// Role hierarchy helpers
export const ROLE_HIERARCHY: Record<ProviderRole, number> = {
  owner: 1,
  admin: 2,
  supervisor: 3,
  staff: 4,
  viewer: 5,
};

export function getRoleRank(role: ProviderRole): number {
  return ROLE_HIERARCHY[role];
}

export function hasHigherOrEqualRole(a: ProviderRole, b: ProviderRole): boolean {
  return getRoleRank(a) <= getRoleRank(b);
}

