"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { decodeJwtPayload } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import type {
  AuthUser,
  Profile,
  AppRole,
  AppPermission,
  ProviderRoleType,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers & constants                                                */
/* ------------------------------------------------------------------ */

const STALE_5_MIN = 5 * 60 * 1000;
const GC_10_MIN = 10 * 60 * 1000;

function getSupabase() {
  return createClient();
}

/* ------------------------------------------------------------------ */
/* Query keys                                                         */
/* ------------------------------------------------------------------ */

export const authKeys = {
  user: ["user"] as const,
  profile: (id: string) => ["profile", id] as const,
  userRole: (id: string) => ["userRole", id] as const,
  permissions: (role: string) => ["permissions", role] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

// -- User -------------------------------------------------------------

// hooks/auth.ts
export function useUser() {
  const supabase = getSupabase();

  return useQuery<AuthUser | null>({
    queryKey: authKeys.user,
    staleTime: STALE_5_MIN,
    gcTime: GC_10_MIN,
    retry: 1,
    queryFn: async () => {
      try {
        // 1️⃣ Do we even have a session?
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) return null;           // not signed in

        // 2️⃣ Session exists → safe to ask for user
        const { data: userData } = await supabase.auth.getUser();
        return userData.user as AuthUser | null;
      } catch (err: unknown) {
        // 3️⃣ Treat "no session" as a non-fatal null
        if (err && typeof err === "object" && "name" in err && err.name === "AuthSessionMissingError") return null;

        console.error("Unexpected auth error:", err);
        return null;                         // fail-soft
      }
    },
  });
}

// -- Profile ----------------------------------------------------------

export function useProfile() {
  const supabase = getSupabase();
  const { data: user, isLoading: userLoading } = useUser();

  return useQuery<Profile | null>({
    queryKey: authKeys.profile(user?.id ?? "unknown"),
    enabled: !!user && !userLoading,
    staleTime: STALE_5_MIN,
    gcTime: GC_10_MIN,
    retry: 1,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as Profile;
    },
  });
}

// -- Sign out ---------------------------------------------------------

export function useSignOut() {
  const supabase = getSupabase();
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Remove only auth-related caches
      qc.removeQueries({ queryKey: authKeys.user });
      qc.removeQueries({ queryKey: ["userRole"] });
      qc.removeQueries({ queryKey: ["userPermissions"] });

      router.push("/login");
      router.refresh();
      toast.success("Signed out successfully");
    },
    onError: (err: { message: string }) => toast.error(`Error signing out: ${err.message}`),
  });
}

// -- Role & provider role --------------------------------------------

export function useUserRole() {
  const supabase = getSupabase();
  const { data: user } = useUser();

  return useQuery<{ role: AppRole; provider_role: ProviderRoleType | null } | null>({
    queryKey: authKeys.userRole(user?.id ?? "unknown"),
    enabled: !!user,
    staleTime: STALE_5_MIN,
    gcTime: GC_10_MIN,
    retry: 1,
    queryFn: async () => {
      if (!user) return null;

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session) return null;

      try {
        // Use jwt-decode package as recommended by Supabase docs
        const rawToken = sessionData.session.access_token;

        // 1. Log the raw JWT token (first 50 chars for security)
        console.log("🔑 Raw JWT Token (first 50 chars):", rawToken.substring(0, 50) + "...");

        const decoded = jwtDecode<{
          user_role?: AppRole;
          provider_role?: ProviderRoleType;
          sub?: string;
          email?: string;
          aud?: string;
          exp?: number;
          iat?: number;
        }>(rawToken);

        // 2. Log the complete decoded JWT claims object
        console.log("🎯 Decoded JWT Claims:", {
          user_role: decoded.user_role,
          provider_role: decoded.provider_role,
          sub: decoded.sub,
          email: decoded.email,
          aud: decoded.aud,
          exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : undefined,
          iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : undefined,
          // Show all other claims
          ...decoded
        });

        // 3. Compare with expected values
        const expectedClaims = { user_role: "admin", provider_role: "owner" };
        console.log("✅ Expected Claims:", expectedClaims);
        console.log("🔍 Claims Match:", {
          user_role_matches: decoded.user_role === expectedClaims.user_role,
          provider_role_matches: decoded.provider_role === expectedClaims.provider_role,
          actual_user_role: decoded.user_role,
          actual_provider_role: decoded.provider_role
        });

        // 4. Log the final return value
        const result = {
          role: decoded.user_role ?? "user",
          provider_role: decoded.provider_role ?? null,
        };
        console.log("📤 useUserRole returning:", result);

        return result;
      } catch (error) {
        console.error("❌ Failed to decode JWT:", error);
        console.error("❌ Raw token length:", sessionData.session.access_token?.length);
        return null;
      }
    },
  });
}

// -- Permissions ------------------------------------------------------

export function useUserPermissions() {
  const supabase = getSupabase();
  const { data: roleData } = useUserRole();

  return useQuery<AppPermission[]>({
    queryKey: authKeys.permissions(roleData?.role ?? ""),
    enabled: !!roleData,
    staleTime: STALE_5_MIN,
    gcTime: GC_10_MIN,
    retry: 1,
    queryFn: async () => {
      if (!roleData) {
        console.log("🚫 useUserPermissions: No roleData available");
        return [];
      }

      const { role, provider_role } = roleData;

      // Log the role data being used
      console.log("👤 useUserPermissions - Role Data:", { role, provider_role });

      // Admin and user roles always use role_permissions table
      // Only catering_provider role uses provider_role_permissions table
      const table = role === "catering_provider"
        ? "provider_role_permissions"
        : "role_permissions";

      const column = role === "catering_provider" ? "provider_role" : "role";
      const key = role === "catering_provider" ? provider_role : role;

      // Log the query details
      console.log("🔍 useUserPermissions - Query Details:", {
        table,
        column,
        key,
        query: `SELECT permission FROM ${table} WHERE ${column} = '${key}'`
      });

      const { data, error } = await supabase.from(table).select("permission").eq(column, key);

      if (error) {
        console.error("❌ Error fetching permissions:", error);
        return [];
      }

      const permissions = (data ?? []).map((p) => p.permission as AppPermission);

      // Log the fetched permissions
      console.log("📋 useUserPermissions - Fetched Permissions:", permissions);
      console.log("🔍 Has users.read permission:", permissions.includes("users.read"));

      return permissions;
    },
  });
}

// -- Convenience hooks ------------------------------------------------

type HookReturn<T> = { value: T; isLoading: boolean; error: unknown };

export function useHasPermission(permission: AppPermission): HookReturn<boolean> {
  const { data = [], isLoading, error } = useUserPermissions();
  const hasPermission = data.includes(permission);

  // Log permission check details
  console.log(`🔐 useHasPermission('${permission}'):`, {
    hasPermission,
    isLoading,
    error: error?.message || null,
    allPermissions: data,
    permissionCount: data.length
  });

  return { value: hasPermission, isLoading, error };
}

export function useIsProvider(): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return { value: data?.role === "catering_provider", isLoading, error };
}

// -- Admin-only lists -------------------------------------------------

export function useRolePermissions() {
  const supabase = getSupabase();
  const { data } = useUserRole();

  return useQuery({
    queryKey: ["rolePermissions"],
    enabled: data?.role === "admin",
    staleTime: STALE_5_MIN,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role, permission", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useProviderRolePermissions() {
  const supabase = getSupabase();
  const { data } = useUserRole();

  return useQuery({
    queryKey: ["providerRolePermissions"],
    enabled: data?.role === "admin",
    staleTime: STALE_5_MIN,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_role_permissions")
        .select("*")
        .order("provider_role, permission", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// -- Users list (admin) ----------------------------------------------

export function useUsers() {
  const supabase = getSupabase();
  const { value: canViewUsers, isLoading } = useHasPermission("users.read");

  return useQuery({
    queryKey: ["users"],
    enabled: !isLoading && canViewUsers,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    queryFn: async () => {
      // profiles
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, updated_at")
        .order("updated_at", { ascending: false });
      if (profilesErr) throw profilesErr;

      if (!profiles?.length) return [];

      // roles - Add explicit filter to help RLS performance (Supabase docs recommendation)
      // Even though RLS policy allows access, explicit filters improve query planning
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role, provider_role")
        .in('user_id', profiles.map(p => p.id)); // Filter to only needed user IDs
      if (rolesErr) throw rolesErr;

      return profiles.map((p) => ({
        ...p,
        user_roles: roles
          ?.filter((r) => r.user_id === p.id)
          .map(({ role, provider_role }) => ({ role, provider_role })),
      }));
    },
  });
}

// -- Refresh session --------------------------------------------------

export function useRefreshSession() {
  const supabase = getSupabase();
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // Force a complete session refresh to get fresh JWT with updated claims
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;

      // Wait a moment for the new JWT to be available
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the new session has the correct claims
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        try {
          const decoded = jwtDecode<{
            user_role?: string;
            provider_role?: string;
          }>(sessionData.session.access_token);

          console.log("🔄 Session refreshed - New JWT claims:", {
            user_role: decoded.user_role,
            provider_role: decoded.provider_role,
            expires_at: new Date(sessionData.session.expires_at! * 1000).toISOString()
          });
        } catch (err) {
          console.error("Failed to decode refreshed JWT:", err);
        }
      }
    },
    onSuccess: () => {
      // Invalidate all auth-related queries
      qc.invalidateQueries({ queryKey: authKeys.user });
      qc.invalidateQueries({ queryKey: ["userRole"] }); // This covers authKeys.userRole
      qc.invalidateQueries({ queryKey: ["permissions"] }); // This covers authKeys.permissions
      qc.invalidateQueries({ queryKey: ["users"] }); // Refresh users list

      // Clear all query cache to ensure fresh data
      qc.clear();

      router.refresh();
      toast.success("Session and JWT refreshed successfully!");
    },
    onError: (err: { message: string }) => {
      console.error("Session refresh failed:", err);
      toast.error(`Failed to refresh session: ${err.message}. Please sign in again.`);
    },
  });
}
