"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import { useMemo } from "react";
import type {
  AuthUser,
} from "@/types";
import { AppRole, ProviderRoleType } from "@/types/supabase";

/* ------------------------------------------------------------------ */
/* Helpers & constants                                                */
/* ------------------------------------------------------------------ */

// Increased stale times to reduce unnecessary refetches
const STALE_10_MIN = 10 * 60 * 1000;
const GC_30_MIN = 30 * 60 * 1000;

// Create a singleton Supabase client to prevent recreation on every render
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

/* ------------------------------------------------------------------ */
/* Query keys                                                         */
/* ------------------------------------------------------------------ */

export const authKeys = {
  user: ["user"] as const,
  profile: (id: string) => ["profile", id] as const,
  userRole: (id: string) => ["userRole", id] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

// -- User -------------------------------------------------------------

// Enhanced user hook that includes profile data
export function useUser() {
  const supabase = getSupabase();

  return useQuery<AuthUser | null>({
    queryKey: authKeys.user,
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    retry: 1,
    queryFn: async () => {
      try {
        // 1️⃣ Check for session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          return null;
        }

        const session = sessionData.session;
        if (!session) return null;

        // 2️⃣ Get user data
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("User fetch error:", userError);
          return null;
        }

        if (!userData.user) return null;

        // 3️⃣ Fetch associated profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single();

        // Profile error is not fatal - user might not have a profile yet
        if (profileError && profileError.code !== 'PGRST116') {
          console.warn("Profile fetch error:", profileError);
        }

        // 4️⃣ Return enhanced user object
        const authUser: AuthUser = {
          ...userData.user,
          profile: profileData || null
        };

        return authUser;
      } catch (err: unknown) {
        // Handle specific auth errors gracefully
        if (err && typeof err === "object" && "name" in err && err.name === "AuthSessionMissingError") {
          return null;
        }

        console.error("Unexpected auth error:", err);
        return null;
      }
    },
  });
}

// -- Profile ----------------------------------------------------------
// Note: Profile data is now included in useUser() hook for better performance
// This hook is kept for backward compatibility and specific profile operations
export function useProfile() {
  const { data: user, isLoading: userLoading, error: userError } = useUser();

  return {
    data: user?.profile || null,
    isLoading: userLoading,
    error: userError,
    refetch: () => {
      // This will be handled by the useUser hook refetch
      console.warn("useProfile refetch - consider using useUser refetch instead");
    }
  };
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

  // Memoize the query key to prevent unnecessary re-renders
  const queryKey = useMemo(() =>
    authKeys.userRole(user?.id ?? "unknown"),
    [user?.id]
  );

  return useQuery<{ role: AppRole; provider_role: ProviderRoleType | null } | null>({
    queryKey,
    enabled: !!user,
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    retry: 1,
    queryFn: async () => {
      if (!user) return null;

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session) return null;

      try {
        // Decode JWT token to extract user role information
        const rawToken = sessionData.session.access_token;

        const decoded = jwtDecode<{
          user_role?: AppRole;
          provider_role?: ProviderRoleType;
          sub?: string;
          email?: string;
          aud?: string;
          exp?: number;
          iat?: number;
        }>(rawToken);

        // Return role information with fallback to 'user' role
        return {
          role: decoded.user_role ?? "user",
          provider_role: decoded.provider_role ?? null,
        };
      } catch (error) {
        console.error("Failed to decode JWT token:", error);
        return null;
      }
    },
  });
}

// -- Role-based hooks -------------------------------------------------

// -- Role-based convenience hooks ------------------------------------

type HookReturn<T> = { value: T; isLoading: boolean; error: unknown };

export function useIsAdmin(): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return { value: data?.role === "admin", isLoading, error };
}

export function useIsProvider(): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return { value: data?.role === "catering_provider", isLoading, error };
}

export function useIsProviderOwner(): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return {
    value: data?.role === "catering_provider" && data?.provider_role === "owner",
    isLoading,
    error
  };
}

export function useIsProviderStaff(): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return {
    value: data?.role === "catering_provider" && data?.provider_role === "staff",
    isLoading,
    error
  };
}

export function useHasRole(role: AppRole): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return { value: data?.role === role, isLoading, error };
}

export function useHasProviderRole(providerRole: ProviderRoleType): HookReturn<boolean> {
  const { data, isLoading, error } = useUserRole();
  return {
    value: data?.role === "catering_provider" && data?.provider_role === providerRole,
    isLoading,
    error
  };
}



// -- Users list (admin) ----------------------------------------------

export function useUsers() {
  const supabase = getSupabase();
  const { value: isAdmin, isLoading } = useIsAdmin();

  return useQuery({
    queryKey: ["users"],
    enabled: !isLoading && isAdmin,
    staleTime: STALE_10_MIN, // Increased from 30 seconds
    gcTime: GC_30_MIN, // Increased from 2 minutes
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
      console.log("🔄 Starting session refresh...");

      // First, let's check the current session
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session) {
        console.log("📋 Current JWT Claims (before refresh):");
        try {
          const currentDecoded = jwtDecode<{
            user_role?: AppRole;
            provider_role?: ProviderRoleType;
            sub?: string;
            email?: string;
            exp?: number;
          }>(currentSession.session.access_token);

          console.log({
            user_role: currentDecoded.user_role,
            provider_role: currentDecoded.provider_role,
            email: currentDecoded.email,
            expires_at: currentDecoded.exp ? new Date(currentDecoded.exp * 1000).toISOString() : 'unknown'
          });
        } catch (err) {
          console.error("Failed to decode current JWT:", err);
        }
      }

      // Force a complete session refresh to get fresh JWT with updated claims
      console.log("🔄 Calling supabase.auth.refreshSession()...");
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("❌ Refresh session error:", error);
        throw error;
      }

      console.log("✅ Session refresh completed");

      // Wait a moment for the new JWT to be available
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get the fresh session to verify the new JWT
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("❌ Get session error after refresh:", sessionError);
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error("No session available after refresh");
      }

      // Log the new JWT claims for debugging
      console.log("🆕 New JWT Claims (after refresh):");
      try {
        const decoded = jwtDecode<{
          user_role?: AppRole;
          provider_role?: ProviderRoleType;
          sub?: string;
          email?: string;
          exp?: number;
        }>(sessionData.session.access_token);

        console.log({
          user_role: decoded.user_role,
          provider_role: decoded.provider_role,
          email: decoded.email,
          expires_at: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown'
        });

        // Verify that we have the expected admin role
        if (decoded.user_role !== 'admin') {
          console.warn("⚠️ Expected admin role but got:", decoded.user_role);
          throw new Error(`Expected admin role but JWT contains: ${decoded.user_role || 'no role'}`);
        } else {
          console.log("✅ Admin role confirmed in JWT");
        }
      } catch (err) {
        console.error("Failed to decode refreshed JWT:", err);
        throw err;
      }

      return sessionData;
    },
    onSuccess: () => {
      console.log("🎉 Session refresh successful, invalidating queries...");

      // Only invalidate specific auth-related queries instead of clearing everything
      qc.invalidateQueries({ queryKey: authKeys.user });
      qc.invalidateQueries({ queryKey: ["userRole"] }); // This covers authKeys.userRole
      qc.invalidateQueries({ queryKey: ["users"] }); // Refresh users list

      // Don't clear all cache - this was causing excessive re-renders
      // qc.clear();

      router.refresh();
      toast.success("Session and JWT refreshed successfully! Admin access should now work.");
    },
    onError: (err: { message: string }) => {
      console.error("❌ Session refresh failed:", err);
      toast.error(`Failed to refresh session: ${err.message}. Please try signing out and back in.`);
    },
  });
}
