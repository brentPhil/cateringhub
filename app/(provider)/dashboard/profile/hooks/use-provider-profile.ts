"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export interface BannerAdjustments {
  zoom: number; // percentage (50-200)
  offsetX: number; // pixels
  offsetY: number; // pixels
  rotation: 0 | 90 | 180 | 270;
}

export type ServiceLocation = Tables<"service_locations">;
export type SocialLink = Tables<"provider_social_links">;
export type GalleryImage = Tables<"provider_gallery_images">;

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_address?: string;
  logo_url?: string;
  description: string;
  service_areas: string[];
  sample_menu_url?: string;
  contact_person_name: string;
  mobile_number: string;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  created_at?: string;
  updated_at?: string;
  banner_image?: string;
  banner_adjustments?: BannerAdjustments | null;
  email?: string;
  tagline?: string;
  // Service locations (multi-location support)
  service_locations?: ServiceLocation[];
  // Social links (normalized)
  provider_social_links?: SocialLink[];
  // Gallery images
  provider_gallery_images?: GalleryImage[];
  // Availability fields
  is_visible?: boolean;
  service_radius?: number;
  daily_capacity?: number;
  advance_booking_days?: number;
  available_days?: string[];
}

export interface ProviderProfileData {
  profile: ProviderProfile;
  userId: string;
}

/**
 * Fetch provider profile data from Supabase
 */
async function fetchProviderProfile(): Promise<ProviderProfileData> {
  // console.log("🟠 [FETCH PROFILE] Starting fetch...");
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // console.log("🔴 [FETCH PROFILE] Not authenticated");
    throw new Error("Not authenticated");
  }

  // console.log("🟠 [FETCH PROFILE] User ID:", user.id);

  // Fetch provider profile with service locations, social links, and gallery images
  const { data, error } = await supabase
    .from("catering_providers")
    .select(`
      *,
      service_locations (
        id,
        provider_id,
        province,
        city,
        barangay,
        street_address,
        postal_code,
        is_primary,
        landmark,
        service_radius,
        service_area_notes,
        created_at,
        updated_at
      ),
      provider_social_links (
        id,
        provider_id,
        platform,
        url,
        created_at,
        updated_at
      ),
      provider_gallery_images (
        id,
        provider_id,
        image_url,
        display_order,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("🔴 [FETCH PROFILE] Error:", error);
    throw error;
  }

  // console.log("🟢 [FETCH PROFILE] Profile fetched successfully");
  // console.log("🟠 [FETCH PROFILE] Full data:", data);
  // console.log("🟠 [FETCH PROFILE] Service locations:", data.service_locations);
  // console.log("🟠 [FETCH PROFILE] Availability fields:", {
  //   is_visible: data.is_visible,
  //   service_radius: data.service_radius,
  //   daily_capacity: data.daily_capacity,
  //   advance_booking_days: data.advance_booking_days,
  //   available_days: data.available_days,
  // });

  // Sort service locations: primary first, then by created_at
  if (data.service_locations && Array.isArray(data.service_locations)) {
    data.service_locations.sort((a: ServiceLocation, b: ServiceLocation) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
  }

  return { profile: data, userId: user.id };
}

/**
 * Hook to fetch and manage provider profile data
 * 
 * @returns Query result with profile data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProviderProfile();
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return <div>{data.profile.business_name}</div>;
 * ```
 */
export function useProviderProfile() {
  return useQuery({
    queryKey: ["provider-profile"],
    queryFn: fetchProviderProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
