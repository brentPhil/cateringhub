"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UploadImageParams {
  file: File;
  bucket: string;
  path: string;
  userId: string;
}

export interface BannerAdjustments {
  zoom: number; // percentage (50-200)
  offsetX: number; // pixels
  offsetY: number; // pixels
  rotation: 0 | 90 | 180 | 270;
}

interface UpdateProviderImageParams {
  userId: string;
  imageType: "logo" | "banner";
  imageUrl: string;
  bannerAdjustments?: BannerAdjustments | null;
}

// Validate image file
export function validateImageFile(
  file: File,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    };
  }

  return { valid: true };
}

// Generate unique filename
export function generateUniqueFilename(
  userId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split(".").pop();
  const sanitizedName = originalFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_]/g, "");

  return `${userId}-${timestamp}-${sanitizedName}.${extension}`;
}

// Upload image to Supabase Storage
async function uploadImageToStorage({
  file,
  bucket,
  path,
  userId,
}: UploadImageParams): Promise<string> {
  const supabase = createClient();

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(userId, file.name);
  const fullPath = `${path}/${uniqueFilename}`;

  // Sanitize path
  const sanitizedPath = fullPath
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.\/]/g, "");

  console.log("Uploading image:", {
    originalPath: fullPath,
    sanitizedPath,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(sanitizedPath, file, {
      cacheControl: "3600",
      upsert: true, // Allow replacing existing files
      contentType: file.type,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  console.log("Image uploaded successfully:", urlData.publicUrl);
  return urlData.publicUrl;
}

// Update provider profile with new image URL and optional banner adjustments
async function updateProviderImage({
  userId,
  imageType,
  imageUrl,
  bannerAdjustments,
}: UpdateProviderImageParams): Promise<void> {
  const supabase = createClient();

  const updateData =
    imageType === "logo"
      ? { logo_url: imageUrl }
      : {
          banner_image: imageUrl,
          ...(bannerAdjustments !== undefined && {
            banner_adjustments: bannerAdjustments,
          }),
        };

  const { error } = await supabase
    .from("catering_providers")
    .update(updateData)
    .eq("user_id", userId);

  if (error) {
    console.error("Database update error:", error);
    throw new Error(`Failed to update ${imageType}: ${error.message}`);
  }

  console.log(`${imageType} updated successfully in database`, {
    imageUrl,
    ...(bannerAdjustments && { bannerAdjustments }),
  });
}

// Hook for uploading logo
export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      userId,
    }: {
      file: File;
      userId: string;
    }) => {
      // Validate file
      const validation = validateImageFile(file, 2); // 2MB limit for logo
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Upload to storage
      const imageUrl = await uploadImageToStorage({
        file,
        bucket: "provider-assets",
        path: "logos",
        userId,
      });

      // Update database
      await updateProviderImage({
        userId,
        imageType: "logo",
        imageUrl,
      });

      return imageUrl;
    },
    onSuccess: (imageUrl) => {
      toast.success("Logo uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
      return imageUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload logo");
      console.error("Logo upload error:", error);
    },
  });
}

// Hook for uploading banner with adjustments
export function useUploadBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      userId,
      adjustments,
    }: {
      file: File;
      userId: string;
      adjustments?: BannerAdjustments;
    }) => {
      // Validate file
      const validation = validateImageFile(file, 5); // 5MB limit for banner
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Upload to storage
      const imageUrl = await uploadImageToStorage({
        file,
        bucket: "provider-assets",
        path: "banners",
        userId,
      });

      // Update database with image URL and adjustments
      await updateProviderImage({
        userId,
        imageType: "banner",
        imageUrl,
        bannerAdjustments: adjustments || null,
      });

      return imageUrl;
    },
    onSuccess: (imageUrl) => {
      toast.success("Banner uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
      return imageUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload banner");
      console.error("Banner upload error:", error);
    },
  });
}

// Hook for deleting image from storage
export function useDeleteImage() {
  return useMutation({
    mutationFn: async ({
      imageUrl,
      bucket,
    }: {
      imageUrl: string;
      bucket: string;
    }) => {
      const supabase = createClient();

      // Extract path from URL
      const urlParts = imageUrl.split(`/${bucket}/`);
      if (urlParts.length < 2) {
        throw new Error("Invalid image URL");
      }

      const path = urlParts[1];

      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error("Delete error:", error);
        throw new Error(`Failed to delete image: ${error.message}`);
      }

      console.log("Image deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete image");
      console.error("Image delete error:", error);
    },
  });
}

