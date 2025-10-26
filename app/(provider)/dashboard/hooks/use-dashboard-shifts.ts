"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfDay } from "date-fns";
import type { ShiftWithAssignee } from "../bookings/hooks/use-shifts";
import type { UserMetadata } from "@/types/api.types";

// Query keys for dashboard shifts
export const dashboardShiftsKeys = {
  all: ["dashboard-shifts"] as const,
  lists: () => [...dashboardShiftsKeys.all, "list"] as const,
  list: (providerId: string) => [...dashboardShiftsKeys.lists(), providerId] as const,
};

/**
 * Hook to fetch upcoming shifts for the dashboard
 * - Shows shifts from today onward (scheduled_start >= start of today)
 * - Limits to 10 results, ordered by scheduled_start ascending
 * - Enriches each shift with assignee metadata (team member or worker profile)
 */
export function useDashboardShifts(providerId: string | undefined) {
  const supabase = createClient();

  return useQuery<ShiftWithAssignee[]>({
    queryKey: dashboardShiftsKeys.list(providerId || ""),
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      console.log("[useDashboardShifts] Fetching upcoming shifts for dashboard:", {
        providerId,
      });

      // Fetch shifts scheduled for today or later
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select("*")
        .gte("scheduled_start", startOfDay(new Date()).toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(10);

      if (error) {
        console.error("[useDashboardShifts] Error fetching shifts:", error);
        throw error;
      }

      // Enrich each shift with assignee metadata
      const shiftsWithAssignees: ShiftWithAssignee[] = await Promise.all(
        (shifts || []).map(async (shift) => {
          // Team member shift (user_id)
          if (shift.user_id) {
            console.log("[useDashboardShifts] Fetching user metadata for shift:", {
              shiftId: shift.id,
              userId: shift.user_id,
            });

            const { data: authUser, error: userError } = await supabase
              .rpc("get_user_metadata", { user_id: shift.user_id })
              .single<UserMetadata>();

            if (userError || !authUser) {
              console.error(
                "[useDashboardShifts] Error fetching user metadata:",
                userError,
                "for user_id:",
                shift.user_id
              );

              return {
                ...shift,
                full_name: "Unknown User",
                email: "",
                avatar_url: undefined,
                assignee_type: "team_member" as const,
              } as ShiftWithAssignee;
            }

            const metadata =
              (authUser.raw_user_meta_data as Record<string, unknown>) || {};

            const full_name =
              (metadata.full_name as string) ||
              authUser.email?.split("@")[0] ||
              "Unknown User";
            const email = authUser.email || "";
            const avatar_url = metadata.avatar_url as string | undefined;

            return {
              ...shift,
              full_name,
              email,
              avatar_url,
              assignee_type: "team_member" as const,
            } as ShiftWithAssignee;
          }

          // Worker profile shift (worker_profile_id)
          if (shift.worker_profile_id) {
            console.log(
              "[useDashboardShifts] Fetching worker profile for shift:",
              {
                shiftId: shift.id,
                workerProfileId: shift.worker_profile_id,
              }
            );

            const { data: workerProfile, error: workerError } = await supabase
              .from("worker_profiles")
              .select("id, name, phone, role, hourly_rate")
              .eq("id", shift.worker_profile_id)
              .single();

            if (workerError || !workerProfile) {
              console.error(
                "[useDashboardShifts] Error fetching worker profile:",
                workerError,
                "for worker_profile_id:",
                shift.worker_profile_id
              );

              return {
                ...shift,
                full_name: "Unknown Worker",
                email: undefined,
                avatar_url: undefined,
                assignee_type: "worker_profile" as const,
              } as ShiftWithAssignee;
            }

            return {
              ...shift,
              full_name: workerProfile.name,
              email: workerProfile.phone || undefined,
              avatar_url: undefined,
              assignee_type: "worker_profile" as const,
              worker_profile: {
                id: workerProfile.id,
                name: workerProfile.name,
                phone: workerProfile.phone || undefined,
                role: workerProfile.role || undefined,
                hourly_rate: workerProfile.hourly_rate || undefined,
              },
            } as ShiftWithAssignee;
          }

          // Fallback: unassigned
          return {
            ...shift,
            full_name: "Unassigned",
            email: undefined,
            avatar_url: undefined,
            assignee_type: "team_member" as const,
          } as ShiftWithAssignee;
        })
      );

      console.log(
        "[useDashboardShifts] Final shifts with assignees:",
        shiftsWithAssignees
      );

      return shiftsWithAssignees;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

