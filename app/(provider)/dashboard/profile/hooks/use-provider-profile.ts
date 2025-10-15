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
  providerId: string;
  canEdit: boolean; // Whether user can edit the profile
}

/**
 * Fetch provider profile data from Supabase using team membership
 * This allows team members to access the business profile
 *
 * NEW ARCHITECTURE (Post-Migration):
 * - Two-table join: provider_members → providers
 * - All business profile data is now in the unified `providers` table
 * - No more catering_providers table
 */
async function fetchProviderProfile(): Promise<ProviderProfileData> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Step 1: Get user's active membership to find their provider
  const { data: membership, error: membershipError } = await supabase
    .from("provider_members")
    .select("id, provider_id, user_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not a member of any provider organization. Please contact your administrator or complete the onboarding process.");
  }

  // Step 2: Fetch provider profile directly (unified table)
  // All business profile fields are now in the providers table
  const { data, error } = await supabase
    .from("providers")
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
    .eq("id", membership.provider_id)
    .single();

  if (error) {
    console.error("🔴 [FETCH PROFILE] Error:", error);
    throw error;
  }

  // Step 3: Determine edit permissions based on role
  const roleHierarchy: Record<string, number> = {
    owner: 1,
    admin: 2,
    manager: 3,
    staff: 4,
    viewer: 5,
  };

  // Owner, Admin, and Manager can edit the profile
  const canEdit = roleHierarchy[membership.role] <= roleHierarchy['manager'];

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

  return {
    profile: data,
    userId: user.id,
    providerId: membership.provider_id,
    canEdit,
  };
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
