"use client";

import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/types/supabase";

type Booking = Database['public']['Tables']['bookings']['Row'];
type ProviderRole = Database['public']['Enums']['provider_role'];

export interface ShiftAggregates {
  totalShifts: number;
  scheduledShifts: number;
  checkedInShifts: number;
  completedShifts: number;
  estimatedHours: number;
  actualHours: number;
}

export interface ProviderConstraints {
  advanceBookingDays: number | null;
  serviceRadius: number | null;
  dailyCapacity: number | null;
  availableDays: string[];
}

export interface StatusTimeline {
  created: string;
  confirmed: string | null;
  completed: string | null;
  cancelled: string | null;
  lastUpdated: string;
}

export interface ServiceLocation {
  id: string;
  province: string | null;
  city: string | null;
  barangay: string | null;
  street_address: string | null;
  landmark: string | null;
  postal_code: string | null;
  service_radius: number | null;
  is_primary: boolean;
}

export interface TeamInfo {
  id: string;
  name: string;
  status: string;
  description: string | null;
  daily_capacity: number | null;
  max_concurrent_events: number | null;
  service_location: ServiceLocation | null;
}

export interface BookingDetailData extends Booking {
  team: TeamInfo | null;
  shiftAggregates: ShiftAggregates;
  providerConstraints: ProviderConstraints;
  relatedBookingsCount: number;
  statusTimeline: StatusTimeline;
}

export interface BookingDetailCapabilities {
  canEdit: boolean;
  canAssign: boolean;
  canManageBilling: boolean;
}

export interface BookingDetailResponse {
  success: boolean;
  data: BookingDetailData;
  userRole: ProviderRole;
  capabilities: BookingDetailCapabilities;
}

// Query keys
export const bookingDetailKeys = {
  all: ['booking-detail'] as const,
  detail: (providerId: string | undefined, bookingId: string | undefined) =>
    [...bookingDetailKeys.all, providerId, bookingId] as const,
};

/**
 * Hook to fetch detailed booking information with enriched metadata
 */
export function useBookingDetail(
  providerId: string | undefined,
  bookingId: string | undefined
) {
  return useQuery<BookingDetailResponse>({
    queryKey: bookingDetailKeys.detail(providerId, bookingId),
    queryFn: async () => {
      if (!providerId || !bookingId) {
        throw new Error('Provider ID and Booking ID are required');
      }

      const response = await fetch(
        `/api/providers/${providerId}/bookings/${bookingId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch booking details');
      }

      return response.json();
    },
    enabled: !!providerId && !!bookingId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

