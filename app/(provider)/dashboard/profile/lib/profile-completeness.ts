import type { ProviderProfile } from "../hooks/use-provider-profile";

export interface ProfileCompletenessResult {
  percentage: number;
  completed: number;
  total: number;
  missingItems: MissingItem[];
}

export interface MissingItem {
  field: string;
  label: string;
  sectionId?: string; // ID of the section to scroll to
}

/**
 * Compute profile completeness based on required fields
 * Returns percentage, counts, and list of missing items
 */
export function computeProfileCompleteness(
  profile: ProviderProfile | null | undefined
): ProfileCompletenessResult {
  if (!profile) {
    return {
      percentage: 0,
      completed: 0,
      total: 11,
      missingItems: [],
    };
  }

  const checks: Array<{
    field: string;
    label: string;
    isComplete: boolean;
    sectionId?: string;
  }> = [
    {
      field: "logo_url",
      label: "Add logo image",
      isComplete: !!profile.logo_url,
      sectionId: "branding-section",
    },
    {
      field: "banner_image",
      label: "Add banner image",
      isComplete: !!profile.banner_image,
      sectionId: "branding-section",
    },
    {
      field: "description",
      label: "Add business description",
      isComplete: !!profile.description && profile.description.trim().length > 0,
      sectionId: "basic-info-section",
    },
    {
      field: "tagline",
      label: "Add tagline",
      isComplete: !!profile.tagline && profile.tagline.trim().length > 0,
      sectionId: "basic-info-section",
    },
    {
      field: "service_locations",
      label: "Add at least one service location",
      isComplete: !!profile.service_locations && profile.service_locations.length > 0,
      sectionId: "service-locations-section",
    },
    {
      field: "provider_social_links",
      label: "Add social media links",
      isComplete: !!profile.provider_social_links && profile.provider_social_links.length > 0,
      sectionId: "social-links-section",
    },
    {
      field: "service_radius",
      label: "Set service radius",
      isComplete: profile.service_radius !== null && profile.service_radius !== undefined,
      sectionId: "availability-section",
    },
    {
      field: "is_visible",
      label: "Set profile visibility",
      isComplete: profile.is_visible !== null && profile.is_visible !== undefined,
      sectionId: "availability-section",
    },
    {
      field: "daily_capacity",
      label: "Set daily capacity",
      isComplete: profile.daily_capacity !== null && profile.daily_capacity !== undefined,
      sectionId: "availability-section",
    },
    {
      field: "advance_booking_days",
      label: "Set advance booking days",
      isComplete: profile.advance_booking_days !== null && profile.advance_booking_days !== undefined,
      sectionId: "availability-section",
    },
    {
      field: "available_days",
      label: "Select available days",
      isComplete: !!profile.available_days && profile.available_days.length > 0,
      sectionId: "availability-section",
    },
  ];

  const completed = checks.filter((check) => check.isComplete).length;
  const total = checks.length;
  const percentage = Math.round((completed / total) * 100);

  const missingItems: MissingItem[] = checks
    .filter((check) => !check.isComplete)
    .map((check) => ({
      field: check.field,
      label: check.label,
      sectionId: check.sectionId,
    }));

  return {
    percentage,
    completed,
    total,
    missingItems,
  };
}

/**
 * Get color variant based on completion percentage
 */
export function getCompletenessVariant(percentage: number): {
  variant: "destructive" | "default" | "secondary";
  color: string;
  badgeClassName: string;
} {
  if (percentage < 50) {
    return {
      variant: "destructive",
      color: "text-red-600",
      badgeClassName: "",
    };
  } else if (percentage < 80) {
    return {
      variant: "default",
      color: "text-yellow-600",
      badgeClassName: "bg-yellow-500 text-white hover:bg-yellow-600",
    };
  } else {
    return {
      variant: "secondary",
      color: "text-green-600",
      badgeClassName: "bg-green-500 text-white hover:bg-green-600",
    };
  }
}

