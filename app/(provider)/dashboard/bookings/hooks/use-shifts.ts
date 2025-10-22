"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  createShift as createShiftAction,
  checkIn as checkInAction,
  checkOut as checkOutAction,
  deleteShift as deleteShiftAction,
} from "../actions/shifts";
import { Tables } from "@/database.types";
import type { UserMetadata } from "@/types/api.types";

// Types
export type Shift = Tables<"shifts"> & {
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
};

export type ShiftWithAssignee = Shift & {
  full_name: string;
  email?: string;
  avatar_url?: string;
  assignee_type: "team_member" | "worker_profile";
  worker_profile?: {
    id: string;
    name: string;
    phone?: string;
    role?: string;
    hourly_rate?: number;
  };
};

// Legacy type alias for backward compatibility
export type ShiftWithUser = ShiftWithAssignee;

// Query keys
export const shiftsKeys = {
  all: ["shifts"] as const,
  lists: () => [...shiftsKeys.all, "list"] as const,
  list: (bookingId: string) => [...shiftsKeys.lists(), bookingId] as const,
  detail: (shiftId: string) => [...shiftsKeys.all, "detail", shiftId] as const,
};

/**
 * Hook to fetch shifts for a booking
 * Supports both team member shifts (user_id) and worker profile shifts (worker_profile_id)
 */
export function useShifts(bookingId: string | undefined) {
  const supabase = createClient();

  return useQuery<ShiftWithAssignee[]>({
    queryKey: shiftsKeys.list(bookingId || ""),
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID is required");

      console.log("[useShifts] Fetching shifts for booking:", bookingId);

      // Fetch shifts
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("booking_id", bookingId)
        .order("scheduled_start", { ascending: true });

      if (error) {
        console.error("[useShifts] Error fetching shifts:", error);
        throw error;
      }

      console.log("[useShifts] Fetched shifts:", shifts);

      // Process each shift to get assignee info (team member or worker profile)
      const shiftsWithAssignees = await Promise.all(
        (shifts || []).map(async (shift) => {
          // Check if this is a team member shift (user_id) or worker profile shift (worker_profile_id)
          if (shift.user_id) {
            // Team member shift - fetch user metadata
            console.log("[useShifts] Fetching user metadata for shift:", {
              shiftId: shift.id,
              userId: shift.user_id,
            });

            const { data: authUser, error: userError } = await supabase
              .rpc("get_user_metadata", { user_id: shift.user_id })
              .single<UserMetadata>();

            if (userError || !authUser) {
              console.error(
                "[useShifts] Error fetching user metadata:",
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
              };
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
            };
          } else if (shift.worker_profile_id) {
            // Worker profile shift - fetch worker profile data
            console.log("[useShifts] Fetching worker profile for shift:", {
              shiftId: shift.id,
              workerProfileId: shift.worker_profile_id,
            });

            const { data: workerProfile, error: workerError } = await supabase
              .from("worker_profiles")
              .select("id, name, phone, role, hourly_rate")
              .eq("id", shift.worker_profile_id)
              .single();

            if (workerError || !workerProfile) {
              console.error(
                "[useShifts] Error fetching worker profile:",
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
              };
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
            };
          } else {
            // Invalid shift - should not happen due to DB constraint
            console.error("[useShifts] Shift has neither user_id nor worker_profile_id:", shift);
            return {
              ...shift,
              full_name: "Invalid Assignment",
              email: undefined,
              avatar_url: undefined,
              assignee_type: "team_member" as const,
            };
          }
        })
      );

      console.log("[useShifts] Final shifts with assignees:", shiftsWithAssignees);

      return shiftsWithAssignees;
    },
    enabled: !!bookingId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook to create a new shift
 * Supports both team member shifts (userId) and worker profile shifts (workerProfileId)
 */
export function useCreateShift(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId?: string;
      workerProfileId?: string;
      role?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
      notes?: string;
    }) => {
      const result = await createShiftAction({
        bookingId,
        ...params,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create shift");
      }

      return result.data;
    },
    onMutate: async (newShift) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: shiftsKeys.list(bookingId) });

      // Snapshot previous value
      const previousShifts = queryClient.getQueryData(shiftsKeys.list(bookingId));

      // Optimistically add pending shift
      queryClient.setQueryData<ShiftWithAssignee[]>(
        shiftsKeys.list(bookingId),
        (old = []) => [
          ...old,
          {
            id: `temp-${Date.now()}`,
            booking_id: bookingId,
            user_id: newShift.userId || null,
            worker_profile_id: newShift.workerProfileId || null,
            role: newShift.role || null,
            scheduled_start: newShift.scheduledStart || null,
            scheduled_end: newShift.scheduledEnd || null,
            actual_start: null,
            actual_end: null,
            status: "scheduled",
            notes: newShift.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            full_name: "Loading...",
            email: "",
            assignee_type: newShift.userId ? "team_member" : "worker_profile",
          } as ShiftWithAssignee,
        ]
      );

      return { previousShifts };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousShifts) {
        queryClient.setQueryData(shiftsKeys.list(bookingId), context.previousShifts);
      }
      toast.error(error instanceof Error ? error.message : "Failed to create shift");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      const assigneeType = variables.userId ? "Team member" : "Worker";
      toast.success(`${assigneeType} assigned successfully`);
    },
  });
}

/**
 * Hook to check in a shift
 */
export function useCheckIn(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const result = await checkInAction(shiftId);

      if (!result.success) {
        throw new Error(result.error || "Failed to check in");
      }

      return result;
    },
    onMutate: async (shiftId) => {
      await queryClient.cancelQueries({ queryKey: shiftsKeys.list(bookingId) });

      const previousShifts = queryClient.getQueryData(shiftsKeys.list(bookingId));

      // Optimistically update shift status
      queryClient.setQueryData<ShiftWithAssignee[]>(
        shiftsKeys.list(bookingId),
        (old = []) =>
          old.map((shift) =>
            shift.id === shiftId
              ? {
                  ...shift,
                  actual_start: new Date().toISOString(),
                  status: "checked_in",
                }
              : shift
          )
      );

      return { previousShifts };
    },
    onError: (error, _variables, context) => {
      if (context?.previousShifts) {
        queryClient.setQueryData(shiftsKeys.list(bookingId), context.previousShifts);
      }
      toast.error(error instanceof Error ? error.message : "Failed to check in");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      toast.success("Checked in successfully");
    },
  });
}

/**
 * Hook to check out a shift
 */
export function useCheckOut(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const result = await checkOutAction(shiftId);

      if (!result.success) {
        throw new Error(result.error || "Failed to check out");
      }

      return result;
    },
    onMutate: async (shiftId) => {
      await queryClient.cancelQueries({ queryKey: shiftsKeys.list(bookingId) });

      const previousShifts = queryClient.getQueryData(shiftsKeys.list(bookingId));

      // Optimistically update shift status
      queryClient.setQueryData<ShiftWithAssignee[]>(
        shiftsKeys.list(bookingId),
        (old = []) =>
          old.map((shift) =>
            shift.id === shiftId
              ? {
                  ...shift,
                  actual_end: new Date().toISOString(),
                  status: "checked_out",
                }
              : shift
          )
      );

      return { previousShifts };
    },
    onError: (error, _variables, context) => {
      if (context?.previousShifts) {
        queryClient.setQueryData(shiftsKeys.list(bookingId), context.previousShifts);
      }
      toast.error(error instanceof Error ? error.message : "Failed to check out");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      toast.success("Checked out successfully");
    },
  });
}

/**
 * Hook to delete a shift
 */
export function useDeleteShift(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const result = await deleteShiftAction(shiftId);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete shift");
      }

      return result;
    },
    onMutate: async (shiftId) => {
      await queryClient.cancelQueries({ queryKey: shiftsKeys.list(bookingId) });

      const previousShifts = queryClient.getQueryData(shiftsKeys.list(bookingId));

      // Optimistically remove shift
      queryClient.setQueryData<ShiftWithAssignee[]>(
        shiftsKeys.list(bookingId),
        (old = []) => old.filter((shift) => shift.id !== shiftId)
      );

      return { previousShifts };
    },
    onError: (error, _variables, context) => {
      if (context?.previousShifts) {
        queryClient.setQueryData(shiftsKeys.list(bookingId), context.previousShifts);
      }
      toast.error(error instanceof Error ? error.message : "Failed to delete shift");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      toast.success("Shift removed successfully");
    },
  });
}

