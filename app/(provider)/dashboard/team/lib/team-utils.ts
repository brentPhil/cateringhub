import type { Database } from "@/database.types";
import { formatDistanceToNow } from "date-fns";

// Provider role type from database
export type ProviderRole = Database["public"]["Enums"]["provider_role"];
export type ProviderMemberStatus = Database["public"]["Enums"]["provider_member_status"];

/**
 * Get badge variant for provider role
 */
export function getRoleBadgeVariant(role: ProviderRole): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "owner":
      return "default"; // Purple/primary
    case "admin":
      return "secondary"; // Blue
    case "manager":
      return "outline"; // Green
    case "staff":
      return "outline"; // Gray
    case "viewer":
      return "outline"; // Slate
    default:
      return "outline";
  }
}

/**
 * Get custom className for role badge color
 */
export function getRoleBadgeClassName(role: ProviderRole): string {
  switch (role) {
    case "owner":
      return "bg-purple-500 text-white hover:bg-purple-600 border-purple-500";
    case "admin":
      return "bg-blue-500 text-white hover:bg-blue-600 border-blue-500";
    case "manager":
      return "bg-green-500 text-white hover:bg-green-600 border-green-500";
    case "staff":
      return "bg-gray-500 text-white hover:bg-gray-600 border-gray-500";
    case "viewer":
      return "bg-slate-500 text-white hover:bg-slate-600 border-slate-500";
    default:
      return "";
  }
}

/**
 * Get badge variant for member status
 */
export function getStatusBadgeVariant(status: ProviderMemberStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default"; // Green
    case "suspended":
      return "destructive"; // Red
    case "pending":
      return "secondary"; // Yellow
    default:
      return "outline";
  }
}

/**
 * Get custom className for status badge color
 */
export function getStatusBadgeClassName(status: ProviderMemberStatus): string {
  switch (status) {
    case "active":
      return "bg-green-500 text-white hover:bg-green-600 border-green-500";
    case "suspended":
      return ""; // Use default destructive variant
    case "pending":
      return "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500";
    default:
      return "";
  }
}

/**
 * Format role display name (sentence case)
 */
export function formatRoleDisplay(role: ProviderRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format status display name (sentence case)
 */
export function formatStatusDisplay(status: ProviderMemberStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Format last active time
 */
export function formatLastActive(timestamp: string | null | undefined): string {
  if (!timestamp) return "Never";
  
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Never";
  }
}

/**
 * Get role hierarchy value (lower is higher priority)
 */
export function getRoleHierarchy(role: ProviderRole): number {
  switch (role) {
    case "owner":
      return 1;
    case "admin":
      return 2;
    case "manager":
      return 3;
    case "staff":
      return 4;
    case "viewer":
      return 5;
    default:
      return 999;
  }
}

/**
 * Check if user can manage another user based on roles
 */
export function canManageUser(currentUserRole: ProviderRole, targetUserRole: ProviderRole): boolean {
  return getRoleHierarchy(currentUserRole) < getRoleHierarchy(targetUserRole);
}

/**
 * Get available roles for invitation (excludes owner)
 */
export function getAvailableRoles(): ProviderRole[] {
  return ["admin", "manager", "staff", "viewer"];
}

/**
 * Get role description
 */
export function getRoleDescription(role: ProviderRole): string {
  switch (role) {
    case "owner":
      return "Full access, can manage all members, cannot be removed";
    case "admin":
      return "Can invite, manage members, view all data";
    case "manager":
      return "Can view and edit bookings, limited member management";
    case "staff":
      return "Can view and edit assigned bookings only";
    case "viewer":
      return "Read-only access to bookings and data";
    default:
      return "";
  }
}

/**
 * Get role permissions list
 */
export function getRolePermissions(role: ProviderRole): string[] {
  switch (role) {
    case "owner":
      return [
        "Full system access",
        "Manage all team members",
        "Delete provider account",
        "Billing and subscription",
        "All admin permissions",
      ];
    case "admin":
      return [
        "Invite team members",
        "Manage members (except owners)",
        "View all bookings",
        "Edit all bookings",
        "View reports",
      ];
    case "manager":
      return [
        "View all bookings",
        "Edit all bookings",
        "Assign bookings to staff",
        "View team members",
        "Limited reports access",
      ];
    case "staff":
      return [
        "View assigned bookings",
        "Edit assigned bookings",
        "Update booking status",
        "View team members",
      ];
    case "viewer":
      return [
        "View bookings (read-only)",
        "View team members",
        "View reports (read-only)",
      ];
    default:
      return [];
  }
}

