"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/types/supabase";

/* ------------------------------------------------------------------ */
/* Types from supabase.ts                                             */
/* ------------------------------------------------------------------ */

// Row/update types for the providers table (no custom interfaces)
type ProviderUpdate = Database["public"]["Tables"]["providers"]["Update"];
type BannerAdjustments =
  Tables<"providers">["banner_adjustments"]; // JSON | null by default

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

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
  const [name, ext] = originalFilename.split(".").reduce<[string, string]>(
    (acc, part, idx, arr) => {
      if (idx < arr.length - 1) {
        acc[0] += `${part}.`;
      } else {
        acc[0] = acc[0].replace(/\.$/, "");
        acc[1] = part;
      }
      return acc;
    },
    ["", ""]
  );
  const sanitized = name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_]/g, "");
  return `${userId}-${timestamp}-${sanitized}.${ext}`;
}

/**
 * Upload an image to Supabase Storage and return its public URL.
 */
async function uploadImageToStorage(params: {
  file: File;
  bucket: string;
  path: string;
  userId: string;
}): Promise<string> {
  // Typed client ensures supabase methods return strongly typed results
const supabase = createClient();
  const { file, bucket, path, userId } = params;
  const uniqueFilename = generateUniqueFilename(userId, file.name);
  const fullPath = `${path}/${uniqueFilename}`
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.\/]/g, "");

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Update the provider record with a new logo or banner URL.
 */
async function updateProviderImage(params: {
  userId: string;
  imageType: "logo" | "banner";
  imageUrl: string;
  bannerAdjustments?: BannerAdjustments | null;
}): Promise<void> {
const supabase = createClient();
  const { userId, imageType, imageUrl, bannerAdjustments } = params;

  // Build update object using the generated ProviderUpdate type
  let updateData: ProviderUpdate;
  if (imageType === "logo") {
    updateData = { logo_url: imageUrl };
  } else {
    updateData = {
      banner_image: imageUrl,
      banner_adjustments: bannerAdjustments ?? null,
    };
  }

  const { error } = await supabase
    .from("providers")
    .update(updateData)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to update ${imageType}: ${error.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Upload a logo (max 2 MB) to Supabase Storage and update the provider.
 */
export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { file: File; userId: string }>({
    mutationFn: async ({ file, userId }) => {
      const { valid, error } = validateImageFile(file, 2);
      if (!valid) throw new Error(error);
      const imageUrl = await uploadImageToStorage({
        file,
        bucket: "provider-assets",
        path: "logos",
        userId,
      });
      await updateProviderImage({
        userId,
        imageType: "logo",
        imageUrl,
      });
      return imageUrl;
    },
    onSuccess: async (imageUrl) => {
      toast.success("Logo uploaded successfully");
      // Await invalidation to avoid dangling promises
      await queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
      return imageUrl;
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upload logo");
      console.error("Logo upload error:", err);
    },
  });
}

/**
 * Upload a banner (max 5 MB) to Supabase Storage and update the provider.
 */
export function useUploadBanner() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { file: File; userId: string; adjustments?: BannerAdjustments }>({
    mutationFn: async ({ file, userId, adjustments }) => {
      const { valid, error } = validateImageFile(file, 5);
      if (!valid) throw new Error(error);
      const imageUrl = await uploadImageToStorage({
        file,
        bucket: "provider-assets",
        path: "banners",
        userId,
      });
      await updateProviderImage({
        userId,
        imageType: "banner",
        imageUrl,
        bannerAdjustments: adjustments ?? null,
      });
      return imageUrl;
    },
    onSuccess: async (imageUrl) => {
      toast.success("Banner uploaded successfully");
      await queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
      return imageUrl;
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upload banner");
      console.error("Banner upload error:", err);
    },
  });
}

/**
 * Delete an image from Supabase Storage.
 */
export function useDeleteImage() {
  return useMutation<void, Error, { imageUrl: string; bucket: string }>({
    mutationFn: async ({ imageUrl, bucket }) => {
const supabase = createClient();
      const urlParts = imageUrl.split(`/${bucket}/`);
      if (urlParts.length < 2) {
        throw new Error("Invalid image URL");
      }
      const path = urlParts[1];
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete image");
      console.error("Image delete error:", err);
    },
  });
}
