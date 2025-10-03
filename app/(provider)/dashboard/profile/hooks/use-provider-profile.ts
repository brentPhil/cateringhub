"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface BannerAdjustments {
  zoom: number; // percentage (50-200)
  offsetX: number; // pixels
  offsetY: number; // pixels
  rotation: 0 | 90 | 180 | 270;
}

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
  social_media_links?: Record<string, string>;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  created_at?: string;
  updated_at?: string;
  banner_image?: string;
  banner_adjustments?: BannerAdjustments | null;
}

export interface ProviderProfileData {
  profile: ProviderProfile;
  userId: string;
}

/**
 * Fetch provider profile data from Supabase
 */
async function fetchProviderProfile(): Promise<ProviderProfileData> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("catering_providers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching provider profile:", error);
    throw error;
  }

  console.log("Provider profile fetched - FULL DATA:", data);
  console.log("Provider profile fetched - banner_adjustments specifically:", data.banner_adjustments);
  console.log("Provider profile fetched - summary:", {
    logo_url: data.logo_url,
    banner_image: data.banner_image,
    banner_adjustments: data.banner_adjustments,
    business_name: data.business_name,
  });

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

