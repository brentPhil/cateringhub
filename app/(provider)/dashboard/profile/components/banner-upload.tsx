"use client";

import { Banner } from "@/components/profile/banner";
import type { BannerAdjustments } from "@/components/profile/banner-editor";
import { useUploadBanner } from "@/hooks/use-image-upload";
import { Loader2 } from "lucide-react";
import { Typography } from "@/components/ui/typography";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface BannerUploadProps {
  /** Initial banner URL from the database */
  initialBannerUrl?: string;
  /** Initial banner adjustments from the database */
  initialAdjustments?: BannerAdjustments | null;
  /** User ID for upload operations */
  userId?: string;
  /** Callback when banner URL changes */
  onBannerChange?: (url: string | undefined) => void;
  /** Height of the banner in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Banner upload component that handles banner image uploads with optimistic updates.
 *
 * Features:
 * - Optimistic UI updates (shows preview immediately)
 * - Automatic upload to Supabase Storage
 * - Saves banner adjustments (zoom, position, rotation) to database
 * - Error handling with automatic revert
 * - Toast notifications for success/error
 * - Cleanup of preview URLs
 * - Self-contained upload progress indicator
 *
 * @example
 * ```tsx
 * <BannerUpload
 *   initialBannerUrl={profile.banner_image}
 *   userId={user.id}
 *   onBannerChange={(url) => console.log('Banner changed:', url)}
 *   height={300}
 * />
 * ```
 */
export function BannerUpload({
  initialBannerUrl,
  initialAdjustments,
  userId,
  onBannerChange,
  height = 300,
  className,
  isLoading,
}: BannerUploadProps) {
  const uploadBanner = useUploadBanner();
  const [bannerUrl, setBannerUrl] = useState<string | undefined>(
    initialBannerUrl
  );
  const [adjustments, setAdjustments] = useState<
    BannerAdjustments | null | undefined
  >(initialAdjustments);

  // Update banner URL when initial value changes
  useEffect(() => {
    console.log("BannerUpload: initialBannerUrl changed:", initialBannerUrl);
    setBannerUrl(initialBannerUrl);
  }, [initialBannerUrl]);

  // Update adjustments when initial value changes
  useEffect(() => {
    console.log(
      "BannerUpload: initialAdjustments changed:",
      initialAdjustments
    );
    setAdjustments(initialAdjustments);
  }, [initialAdjustments]);

  // Debug current state
  useEffect(() => {
    console.log("BannerUpload: Current state:", {
      bannerUrl,
      adjustments,
      initialAdjustments,
    });
  }, [bannerUrl, adjustments, initialAdjustments]);

  // Notify parent of banner URL changes
  useEffect(() => {
    onBannerChange?.(bannerUrl);
  }, [bannerUrl, onBannerChange]);

  const handleBannerSave = useCallback(
    async (file: File, newAdjustments: BannerAdjustments) => {
      if (!userId) {
        console.error("User ID not available for banner upload");
        toast.error("Unable to upload banner. Please try again.");
        return;
      }

      console.log("Banner save:", { file, adjustments: newAdjustments });

      // Optimistic update - show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setBannerUrl(previewUrl);
      setAdjustments(newAdjustments);

      try {
        // Upload to Supabase Storage with adjustments
        const uploadedUrl = await uploadBanner.mutateAsync({
          file,
          userId,
          adjustments: newAdjustments,
        });

        // Update with actual URL after successful upload
        setBannerUrl(uploadedUrl);

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);
      } catch (error) {
        // Revert to original on error
        console.error("Banner upload failed:", error);
        setBannerUrl(initialBannerUrl);
        setAdjustments(initialAdjustments);
        URL.revokeObjectURL(previewUrl);
        // Error toast is already shown by the mutation hook
      }
    },
    [userId, uploadBanner, initialBannerUrl, initialAdjustments]
  );

  return (
    <div className="relative">
      <Banner
        src={bannerUrl}
        alt="Profile banner"
        onSave={handleBannerSave}
        height={height}
        className={className}
        loading={isLoading}
        adjustments={adjustments}
      />

      {/* Upload progress indicator */}
      {uploadBanner.isPending && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-md z-10">
          <div className="flex flex-col items-center gap-3 bg-background border border-border rounded-lg shadow-lg p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Typography variant="smallText" className="text-muted-foreground">
              Uploading banner...
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
}
