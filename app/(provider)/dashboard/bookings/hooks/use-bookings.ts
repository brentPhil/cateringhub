"use client";

import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/types/supabase";

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  team?: {
    id: string;
    name: string;
    status: string;
  } | null;
};
type ProviderRole = Database['public']['Enums']['provider_role'];

export interface BookingsFilters {
  search?: string;
  status?: string;
  source?: string;
  team?: string;
  service_location_id?: string;
  my_team?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

export interface BookingsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BookingsResponse {
  success: boolean;
  data: Booking[];
  pagination: BookingsPagination;
  filters: BookingsFilters;
  userRole: ProviderRole;
  canEditBookings: boolean;
}

// Query keys
export const bookingsKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingsKeys.all, 'list'] as const,
  list: (providerId: string | undefined, filters: BookingsFilters) =>
    [...bookingsKeys.lists(), providerId, filters] as const,
  detail: (bookingId: string) => [...bookingsKeys.all, 'detail', bookingId] as const,
};

/**
 * Hook to fetch bookings with role-based filtering
 */
export function useBookings(
  providerId: string | undefined,
  filters: BookingsFilters = {}
) {
  return useQuery<BookingsResponse>({
    queryKey: bookingsKeys.list(providerId, filters),
    queryFn: async () => {
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      // Build query string
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.source) params.append('source', filters.source);
      if (filters.team) params.append('team', filters.team);
      if (filters.service_location_id) params.append('service_location_id', filters.service_location_id);
      if (filters.my_team) params.append('my_team', 'true');
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      const response = await fetch(
        `/api/providers/${providerId}/bookings?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch bookings');
      }

      return response.json();
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single booking by ID
 */
export function useBooking(bookingId: string | undefined) {
  return useQuery<Booking>({
    queryKey: bookingsKeys.detail(bookingId || ''),
    queryFn: async () => {
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const response = await fetch(`/api/bookings/${bookingId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch booking');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!bookingId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
