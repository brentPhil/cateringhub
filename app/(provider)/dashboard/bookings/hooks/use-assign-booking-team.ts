"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingsKeys } from "./use-bookings";
import { shiftsKeys } from "./use-shifts";

interface AssignBookingTeamParams {
  teamId: string | null;
}

export function useAssignBookingTeam(providerId: string, bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, AssignBookingTeamParams>({
    mutationFn: async ({ teamId }) => {
      const response = await fetch(
        `/api/providers/${providerId}/bookings/${bookingId}/team`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: teamId }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error?.error?.message || "Failed to assign team to booking"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh bookings lists and any cached detail
      queryClient.invalidateQueries({ queryKey: bookingsKeys.lists() });
      // Refresh shifts for this booking so roster appears immediately
      queryClient.invalidateQueries({ queryKey: shiftsKeys.list(bookingId) });
      toast.success("Team assigned to booking");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign team");
    },
  });
}
