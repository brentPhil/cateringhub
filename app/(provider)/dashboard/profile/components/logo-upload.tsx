"use client";

import * as React from "react";
import { useUploadLogo } from "@/hooks/use-image-upload";
import { Loader2 } from "lucide-react";
import { LogoPicker } from "@/components/profile/logo-picker";

export interface LogoUploadProps {
  /** Initial logo URL from the database */
  initialLogoUrl?: string;
  /** User ID for upload operations */
  userId?: string;
  /** Callback when logo URL changes */
  onLogoChange?: (url: string | undefined) => void;
  /** Label for the logo picker */
  label?: string;
  /** Shape of the logo (circle or square) */
  shape?: "circle" | "square";
  /** Size of the logo in pixels */
  size?: number;
  /** Fallback text when no logo is available */
  fallback?: string;
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Logo upload component that handles logo image uploads with optimistic updates.
 *
 * Features:
 * - Optimistic UI updates (shows preview immediately)
 * - Automatic upload to Supabase Storage
 * - Error handling with automatic revert
 * - Toast notifications for success/error
 * - Cleanup of preview URLs
 * - Support for both File and URL string inputs
 * - Self-contained upload progress indicator
 */
export function LogoUpload({
  initialLogoUrl,
  userId,
  onLogoChange,
  label = "Logo",
  shape = "circle",
  size = 120,
  fallback = "CH",
  className,
  isLoading,
}: LogoUploadProps) {
  const uploadLogo = useUploadLogo();
  const [logoUrl, setLogoUrl] = React.useState<string | undefined>(
    initialLogoUrl
  );

  // Update logo URL when initial value changes
  React.useEffect(() => {
    console.log("LogoUpload: initialLogoUrl changed:", initialLogoUrl);
    setLogoUrl(initialLogoUrl);
  }, [initialLogoUrl]);

  // Notify parent of logo URL changes
  React.useEffect(() => {
    onLogoChange?.(logoUrl);
  }, [logoUrl, onLogoChange]);

  const handleLogoChange = React.useCallback(
    async (fileOrUrl: File | string) => {
      if (!userId) {
        console.error("User ID not available for logo upload");
        return;
      }

      console.log("Logo change:", fileOrUrl);

      if (fileOrUrl instanceof File) {
        // Optimistic update - show preview immediately
        const previewUrl = URL.createObjectURL(fileOrUrl);
        setLogoUrl(previewUrl);

        try {
          // Upload to Supabase Storage
          const uploadedUrl = await uploadLogo.mutateAsync({
            file: fileOrUrl,
            userId,
          });

          // Update with actual URL after successful upload
          setLogoUrl(uploadedUrl);

          // Clean up preview URL
          URL.revokeObjectURL(previewUrl);
        } catch (error) {
          // Revert to original on error
          console.error("Logo upload failed:", error);
          setLogoUrl(initialLogoUrl);
          URL.revokeObjectURL(previewUrl);
        }
      } else {
        // Handle URL string (if needed for future use cases)
        setLogoUrl(fileOrUrl);
      }
    },
    [userId, uploadLogo, initialLogoUrl]
  );

  console.log("LogoUpload: rendering with logoUrl:", logoUrl);

  return (
    <div className="relative inline-block">
      <LogoPicker
        value={logoUrl}
        onChange={handleLogoChange}
        label={label}
        shape={shape}
        size={size}
        fallback={fallback}
        className={className}
        loading={isLoading}
      />

      {/* Upload progress indicator */}
      {uploadLogo.isPending && (
        <div
          className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-full z-10"
          style={{ width: size, height: size }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
