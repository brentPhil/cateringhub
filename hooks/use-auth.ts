"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User, SupabaseClient, AuthError, PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/types/supabase";

/* ------------------------------------------------------------------ */
/* Types (from supabase.ts ONLY)                                       */
/* ------------------------------------------------------------------ */

type ProfileRow = Tables<"profiles">;
type Profile = ProfileRow | null;

export type AuthUser = User & {
  profile: Profile;
};

/* ------------------------------------------------------------------ */
/* Helpers & constants                                                */
/* ------------------------------------------------------------------ */

const STALE_10_MIN = 10 * 60 * 1000;
const GC_30_MIN = 30 * 60 * 1000;

const IS_DEV = process.env.NODE_ENV !== "production";

// Typed singleton Supabase client (single source of truth: Database)
let supabaseClient: SupabaseClient<Database> | null = null;

function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) supabaseClient = createClient();
  return supabaseClient;
}

// Narrow unknown safely (no any)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function getStringProp(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" ? v : null;
}

// Your special-case auth errors (typed, no any)
function isAuthSessionMissingError(err: unknown): boolean {
  if (!isRecord(err)) return false;
  return getStringProp(err, "name") === "AuthSessionMissingError";
}
function isJwtUserMissingError(err: unknown): boolean {
  if (!isRecord(err)) return false;
  const msg = getStringProp(err, "message");
  return typeof msg === "string" && msg.includes("User from sub claim in JWT does not exist");
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isRecord(err)) {
    const msg = getStringProp(err, "message");
    if (msg) return msg;
  }
  return "Unknown error";
}

/* ------------------------------------------------------------------ */
/* Query keys                                                         */
/* ------------------------------------------------------------------ */

export const authKeys = {
  user: ["user"] as const,
  profile: (id: string) => ["profile", id] as const,
  isProvider: ["user", "isProvider"] as const,
  users: ["users"] as const,
} as const;

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

// -- User -------------------------------------------------------------

export function useUser() {
  const supabase = getSupabase();

  return useQuery<AuthUser | null, AuthError | PostgrestError | Error>({
    queryKey: authKeys.user,
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    retry: 1,
    queryFn: async () => {
      try {
        // 1) session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) return null;

        if (!sessionData.session) return null;

        // 2) user
        const { data: userData, error: userError } = await supabase.auth.getUser();

        // stale JWT edge-case
        if (userError?.message?.includes("User from sub claim in JWT does not exist")) {
          await supabase.auth.signOut({ scope: "local" });
          return null;
        }
        if (userError) return null;
        if (!userData.user) return null;

        // 3) profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single();

        // If no row (PGRST116), treat as no profile (not fatal)
        if (profileError && profileError.code !== "PGRST116") {
          if (IS_DEV) console.warn("Profile fetch error:", profileError);
        }

        // 4) enhanced user
        const authUser: AuthUser = {
          ...userData.user,
          profile: profileData ?? null,
        };

        return authUser;
      } catch (err: unknown) {
        if (isAuthSessionMissingError(err)) return null;
        if (isJwtUserMissingError(err)) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {}
          return null;
        }
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

  return useMutation<void, AuthError | Error>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: authKeys.user });

      router.push("/login");
      router.refresh();
      toast.success("Signed out successfully");
    },
    onError: (err) => toast.error(`Error signing out: ${toErrorMessage(err)}`),
  });
}

// -- Provider status check --------------------------------------------

export function useIsProvider() {
  const supabase = getSupabase();
  const userQuery = useUser();

  return useQuery<boolean, PostgrestError | Error>({
    queryKey: authKeys.isProvider,
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    enabled: !!userQuery.data,
    queryFn: async () => {
      try {
        // Typed from Database["public"]["Functions"]["is_provider"]["Returns"] => boolean
        const { data, error } = await supabase.rpc("is_provider");

        if (IS_DEV) {
          console.log("🔍 [AUTH] useIsProvider RPC result:", {
            userId: userQuery.data?.id,
            hasProviderMembership: data,
            error: error?.message,
          });
        }

        if (error) return false;
        return data ?? false;
      } catch {
        return false;
      }
    },
  });
}

// -- Combined auth info ------------------------------------------------

export function useAuthInfo() {
  const userQuery = useUser();
  const isProviderQuery = useIsProvider();

  return useMemo(() => {
    return {
      user: userQuery.data,
      profile: userQuery.data?.profile ?? null,
      isProvider: isProviderQuery.data ?? false,
      isLoading: userQuery.isLoading || isProviderQuery.isLoading,
      error: userQuery.error || isProviderQuery.error,
    };
  }, [
    userQuery.data,
    userQuery.isLoading,
    userQuery.error,
    isProviderQuery.data,
    isProviderQuery.isLoading,
    isProviderQuery.error,
  ]);
}

// -- Users list --------------------------------------------------------

type UserListItem = Pick<ProfileRow, "id" | "full_name" | "updated_at">;

export function useUsers() {
  const supabase = getSupabase();

  return useQuery<UserListItem[], PostgrestError | Error>({
    queryKey: authKeys.users,
    staleTime: STALE_10_MIN,
    gcTime: GC_30_MIN,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// -- Refresh session ---------------------------------------------------

export function useRefreshSession() {
  const supabase = getSupabase();
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation<void, AuthError | Error>({
    mutationFn: async () => {
      if (IS_DEV) console.log("🔄 Starting session refresh...");

      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;

      // give the SDK a moment to persist session
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("No session available after refresh");
    },
    onSuccess: async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: authKeys.user }),
      qc.invalidateQueries({ queryKey: ["users"] }),
    ]);

    router.refresh();
    toast.success("Session refreshed successfully!");
  },
    onError: (err) => {
      toast.error(
        `Failed to refresh session: ${toErrorMessage(err)}. Please try signing out and back in.`
      );
    },
  });
}
