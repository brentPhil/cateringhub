"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/database.types";
import {
  createShift as createShiftAction,
  checkIn as checkInAction,
  checkOut as checkOutAction,
  deleteShift as deleteShiftAction,
} from "../actions/shifts";

// Types
export type Shift = Tables<"shifts"> & {
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
};

export type ShiftWithUser = Shift & {
  full_name: string;
  email: string;
  avatar_url?: string;
};

// Query keys
export const shiftsKeys = {
  all: ["shifts"] as const,
  lists: () => [...shiftsKeys.all, "list"] as const,
  list: (bookingId: string) => [...shiftsKeys.lists(), bookingId] as const,
  detail: (shiftId: string) => [...shiftsKeys.all, "detail", shiftId] as const,
};

/**
 * Hook to fetch shifts for a booking
 */
export function useShifts(bookingId: string | undefined) {
  const supabase = createClient();

  return useQuery<ShiftWithUser[]>({
    queryKey: shiftsKeys.list(bookingId || ""),
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID is required");

      console.log("[useShifts] Fetching shifts for booking:", bookingId);

      // Fetch shifts and join with provider_members to get user metadata
      // We need to get the booking's provider_id first to join correctly
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("provider_id")
        .eq("id", bookingId)
        .single();

      if (bookingError) {
        console.error("[useShifts] Error fetching booking:", bookingError);
        throw bookingError;
      }

      console.log("[useShifts] Booking provider_id:", booking.provider_id);

      // Fetch shifts with user data from provider_members
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

      // Fetch user metadata using the get_user_metadata RPC function
      const shiftsWithUsers = await Promise.all(
        (shifts || []).map(async (shift) => {
          console.log("[useShifts] Fetching user metadata for shift:", {
            shiftId: shift.id,
            userId: shift.user_id,
          });

          const { data: authUser, error: userError } = await supabase
            .rpc("get_user_metadata", { user_id: shift.user_id })
            .single();

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
            };
          }

          console.log("[useShifts] User metadata response:", {
            userId: shift.user_id,
            authUser,
          });

          const metadata =
            (authUser.raw_user_meta_data as Record<string, unknown>) || {};

          const full_name =
            (metadata.full_name as string) ||
            authUser.email?.split("@")[0] ||
            "Unknown User";
          const email = authUser.email || "";
          const avatar_url = metadata.avatar_url as string | undefined;

          console.log("[useShifts] Extracted user info:", {
            full_name,
            email,
            avatar_url,
          });

          return {
            ...shift,
            full_name,
            email,
            avatar_url,
          };
        })
      );

      console.log("[useShifts] Final shifts with users:", shiftsWithUsers);

      return shiftsWithUsers;
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
 */
export function useCreateShift(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
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
      queryClient.setQueryData<ShiftWithUser[]>(
        shiftsKeys.list(bookingId),
        (old = []) => [
          ...old,
          {
            id: `temp-${Date.now()}`,
            booking_id: bookingId,
            user_id: newShift.userId,
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
          } as ShiftWithUser,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      toast.success("Team member assigned successfully");
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
      queryClient.setQueryData<ShiftWithUser[]>(
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
      queryClient.setQueryData<ShiftWithUser[]>(
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
      queryClient.setQueryData<ShiftWithUser[]>(
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

