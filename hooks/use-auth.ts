"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMemo } from "react";
import type {
  AuthUser,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers & constants                                                */
/* ------------------------------------------------------------------ */

// Increased stale times to reduce unnecessary refetches
const STALE_10_MIN = 10 * 60 * 1000;
const GC_30_MIN = 30 * 60 * 1000;

const IS_DEV = process.env.NODE_ENV !== "production";

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

      router.push("/login");
      router.refresh();
      toast.success("Signed out successfully");
    },
    onError: (err: { message: string }) => toast.error(`Error signing out: ${err.message}`),
  });
}

// -- Combined auth info ------------------------------------------------

/**
 * Convenience hook that aggregates user and profile information
 * into a single object to avoid multiple hook invocations in components.
 */
export function useAuthInfo() {
  const userQuery = useUser();

  const info = useMemo(() => {
    return {
      user: userQuery.data,
      profile: userQuery.data?.profile || null,
      isLoading: userQuery.isLoading,
      error: userQuery.error,
    };
  }, [userQuery.data, userQuery.isLoading, userQuery.error]);

  return info;
}



// -- Users list ----------------------------------------------

export function useUsers() {
  const supabase = getSupabase();

  return useQuery({
    queryKey: ["users"],
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    queryFn: async () => {
      // Fetch profiles only - authorization is now handled through provider_members
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, updated_at")
        .order("updated_at", { ascending: false });
      if (profilesErr) throw profilesErr;

      return profiles || [];
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
      if (IS_DEV) console.log("🔄 Starting session refresh...");

      // Force a complete session refresh
      if (IS_DEV) console.log("🔄 Calling supabase.auth.refreshSession()...");
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("❌ Refresh session error:", error);
        throw error;
      }

      if (IS_DEV) console.log("✅ Session refresh completed");

      // Wait a moment for the new session to be available
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the fresh session to verify
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("❌ Get session error after refresh:", sessionError);
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error("No session available after refresh");
      }

      return sessionData;
    },
    onSuccess: () => {
      if (IS_DEV) console.log("🎉 Session refresh successful, invalidating queries...");

      // Only invalidate specific auth-related queries instead of clearing everything
      qc.invalidateQueries({ queryKey: authKeys.user });
      qc.invalidateQueries({ queryKey: ["users"] }); // Refresh users list

      router.refresh();
      toast.success("Session refreshed successfully!");
    },
    onError: (err: { message: string }) => {
      console.error("❌ Session refresh failed:", err);
      toast.error(`Failed to refresh session: ${err.message}. Please try signing out and back in.`);
    },
  });
}
