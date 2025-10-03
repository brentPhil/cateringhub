"use client";

import * as React from "react";
import { BrandColorPicker } from "@/components/profile/brand-color-picker";
import { Typography } from "@/components/ui/typography";
import { BannerUpload } from "./components/banner-upload";
import { LogoUpload } from "./components/logo-upload";
import { useProviderProfile } from "./hooks/use-provider-profile";

export default function ProfilePage() {
  // Fetch provider profile
  const { data, isLoading, error } = useProviderProfile();

  // Mounted state to prevent hydration mismatch
  // Ensures server and client render the same initial HTML
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Brand color state (TODO: add to database schema)
  const [brandColor, setBrandColor] = React.useState<string | undefined>(
    "#2563EB"
  );

  // Debug logging - always log to see what's happening
  React.useEffect(() => {
    console.log("ProfilePage: Query state:", {
      isLoading,
      hasError: !!error,
      hasData: !!data,
      data,
    });

    if (data) {
      console.log("ProfilePage: data received:", {
        logo_url: data.profile?.logo_url,
        banner_image: data.profile?.banner_image,
        banner_adjustments: data.profile?.banner_adjustments,
        userId: data.userId,
      });
    }

    if (error) {
      console.error("ProfilePage: error:", error);
    }
  }, [data, isLoading, error]);

  const handleColorChange = (color: string) => {
    console.log("Brand color change:", color);
    setBrandColor(color);
    // TODO: Update in Supabase
    // await supabase.from('catering_providers').update({ brand_color: color }).eq('user_id', userId)
  };

  // Use mounted guard to ensure consistent initial render
  // Server and client both render with showLoading=true initially
  // After mount, client can update to show actual loading state
  const showLoading = !mounted || isLoading;

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <Typography variant="h4" className="text-destructive">
            Error loading profile
          </Typography>
          <Typography variant="mutedText">
            {error instanceof Error ? error.message : "An error occurred"}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section */}
      <div className="relative">
        <BannerUpload
          initialBannerUrl={data?.profile?.banner_image}
          initialAdjustments={data?.profile?.banner_adjustments}
          userId={data?.userId}
          height={300}
          isLoading={showLoading}
        />

        {/* Logo overlapping banner - bottom left */}
        <div className="absolute -bottom-16 left-8">
          <LogoUpload
            initialLogoUrl={data?.profile?.logo_url}
            userId={data?.userId}
            label="Logo"
            shape="circle"
            size={120}
            fallback="CH"
            isLoading={showLoading}
          />
        </div>

        {/* Brand color picker - bottom right */}
        <div className="absolute -bottom-18 right-0">
          <BrandColorPicker value={brandColor} onChange={handleColorChange} />
        </div>
      </div>
    </div>
  );
}
