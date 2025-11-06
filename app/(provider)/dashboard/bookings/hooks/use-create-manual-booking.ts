"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { bookingsKeys } from "./use-bookings";

export interface CreateManualBookingParams {
  providerId: string;
  customerName: string;
  eventDate: string; // ISO date string (YYYY-MM-DD)
  serviceLocationId?: string;
  customerPhone?: string;
  customerEmail?: string;
  eventTime?: string; // HH:MM:SS format
  eventType?: string;
  guestCount?: number;
  venueName?: string;
  venueAddress?: string;
  estimatedBudget?: number;
  specialRequests?: string;
  notes?: string;
  basePrice?: number;
  teamId?: string;
  status?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
}

export interface ManualBookingResponse {
  id: string;
  status: string;
  event_date: string;
  source: string;
  base_price: number | null;
  total_price: number | null;
  created_at: string;
  created_by: string;
}

/**
 * Hook to create a manual booking using the create_manual_booking RPC function
 */
export function useCreateManualBooking() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation<ManualBookingResponse, Error, CreateManualBookingParams>({
    mutationFn: async (params) => {
      // Call the RPC function
      const { data, error } = await supabase.rpc("create_manual_booking", {
        p_provider_id: params.providerId,
        p_customer_name: params.customerName,
        p_event_date: params.eventDate,
        p_service_location_id: params.serviceLocationId || null,
        p_customer_phone: params.customerPhone || null,
        p_customer_email: params.customerEmail || null,
        p_event_time: params.eventTime || null,
        p_event_type: params.eventType || null,
        p_guest_count: params.guestCount || null,
        p_venue_name: params.venueName || null,
        p_venue_address: params.venueAddress || null,
        p_estimated_budget: params.estimatedBudget || null,
        p_special_requests: params.specialRequests || null,
        p_notes: params.notes || null,
        p_base_price: params.basePrice || null,
        p_team_id: params.teamId || null,
        p_status: params.status || "pending",
      });

      if (error) {
        throw new Error(error.message || "Failed to create manual booking");
      }

      return data as ManualBookingResponse;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingsKeys.lists() });
    },
    onError: (error) => {
      // Fire telemetry event for error
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "manual_booking_error", {
          error_message: error.message,
        });
      }

      toast.error(error.message || "Failed to create manual booking");
    },
    onSuccess: (data) => {
      // Fire telemetry event for success
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "manual_booking_success", {
          booking_id: data.id,
          status: data.status,
        });
      }

      // Invalidate and refetch bookings list
      queryClient.invalidateQueries({ queryKey: bookingsKeys.lists() });

      toast.success("Manual booking created successfully");
    },
  });
}
