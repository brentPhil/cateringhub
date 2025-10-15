"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_GALLERY_IMAGES = 20;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Upload a new gallery image for a provider
 */
export async function uploadGalleryImage(
  providerId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Verify user owns this provider
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify provider belongs to user
    const { data: provider, error: providerError } = await supabase
      .from("catering_providers")
      .select("id")
      .eq("id", providerId)
      .eq("user_id", user.id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: "Provider not found or unauthorized" };
    }

    // Get the file from formData
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "File size exceeds 5MB limit",
      };
    }

    // Check gallery limit
    const { count, error: countError } = await supabase
      .from("provider_gallery_images")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", providerId);

    if (countError) {
      return {
        success: false,
        error: `Failed to check gallery limit: ${countError.message}`,
      };
    }

    if (count !== null && count >= MAX_GALLERY_IMAGES) {
      return {
        success: false,
        error: `Gallery limit reached. Maximum ${MAX_GALLERY_IMAGES} images allowed`,
      };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const imageId = crypto.randomUUID();
    const fileName = `${imageId}.${fileExt}`;
    const filePath = `gallery/${providerId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("provider-assets")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload image: ${uploadError.message}`,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("provider-assets").getPublicUrl(filePath);

    // Get the next display order (highest + 1)
    const { data: lastImage } = await supabase
      .from("provider_gallery_images")
      .select("display_order")
      .eq("provider_id", providerId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = lastImage ? lastImage.display_order + 1 : 0;

    // Insert record into database
    const { data: newImage, error: insertError } = await supabase
      .from("provider_gallery_images")
      .insert({
        provider_id: providerId,
        image_url: publicUrl,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: Delete uploaded file
      await supabase.storage.from("provider-assets").remove([filePath]);

      return {
        success: false,
        error: `Failed to save image record: ${insertError.message}`,
      };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
      data: newImage,
    };
  } catch (error) {
    console.error("Error uploading gallery image:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Remove a gallery image
 */
export async function removeGalleryImage(
  providerId: string,
  imageId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Verify user owns this provider
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify provider belongs to user
    const { data: provider, error: providerError } = await supabase
      .from("catering_providers")
      .select("id")
      .eq("id", providerId)
      .eq("user_id", user.id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: "Provider not found or unauthorized" };
    }

    // Get the image record to get the URL
    const { data: image, error: fetchError } = await supabase
      .from("provider_gallery_images")
      .select("image_url")
      .eq("id", imageId)
      .eq("provider_id", providerId)
      .single();

    if (fetchError || !image) {
      return { success: false, error: "Image not found" };
    }

    // Extract file path from URL
    const url = new URL(image.image_url);
    const pathParts = url.pathname.split("/");
    const filePath = pathParts.slice(pathParts.indexOf("gallery")).join("/");

    // Delete from database (this will trigger the featured image cleanup)
    const { error: deleteError } = await supabase
      .from("provider_gallery_images")
      .delete()
      .eq("id", imageId)
      .eq("provider_id", providerId);

    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete image record: ${deleteError.message}`,
      };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("provider-assets")
      .remove([filePath]);

    if (storageError) {
      console.error("Failed to delete file from storage:", storageError);
      // Don't fail the operation if storage deletion fails
      // The database record is already deleted
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing gallery image:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Reorder gallery images
 */
export async function reorderGalleryImages(
  providerId: string,
  imageIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Verify user owns this provider
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify provider belongs to user
    const { data: provider, error: providerError } = await supabase
      .from("catering_providers")
      .select("id")
      .eq("id", providerId)
      .eq("user_id", user.id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: "Provider not found or unauthorized" };
    }

    // Verify all images belong to this provider
    const { data: existingImages, error: fetchError } = await supabase
      .from("provider_gallery_images")
      .select("id")
      .eq("provider_id", providerId);

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch images: ${fetchError.message}`,
      };
    }

    const existingIds = existingImages?.map((img) => img.id) || [];
    const invalidIds = imageIds.filter((id) => !existingIds.includes(id));

    if (invalidIds.length > 0) {
      return {
        success: false,
        error: "Some images do not belong to this provider",
      };
    }

    // Update display_order for each image
    const updates = imageIds.map((id, index) => ({
      id,
      provider_id: providerId,
      display_order: index,
    }));

    const { error: updateError } = await supabase
      .from("provider_gallery_images")
      .upsert(updates, { onConflict: "id" });

    if (updateError) {
      return {
        success: false,
        error: `Failed to reorder images: ${updateError.message}`,
      };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error reordering gallery images:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Set or clear the featured image for a provider
 */
export async function setFeaturedImage(
  providerId: string,
  imageId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Verify user owns this provider
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify provider belongs to user
    const { data: provider, error: providerError } = await supabase
      .from("catering_providers")
      .select("id")
      .eq("id", providerId)
      .eq("user_id", user.id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: "Provider not found or unauthorized" };
    }

    let featuredImageUrl: string | null = null;

    // If setting a featured image (not clearing)
    if (imageId) {
      // Verify the image exists in the provider's gallery
      const { data: image, error: imageError } = await supabase
        .from("provider_gallery_images")
        .select("image_url")
        .eq("id", imageId)
        .eq("provider_id", providerId)
        .single();

      if (imageError || !image) {
        return {
          success: false,
          error: "Image not found in gallery",
        };
      }

      featuredImageUrl = image.image_url;
    }

    // Update the featured_image_url in catering_providers
    const { error: updateError } = await supabase
      .from("catering_providers")
      .update({ featured_image_url: featuredImageUrl })
      .eq("id", providerId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to set featured image: ${updateError.message}`,
      };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
      data: { featured_image_url: featuredImageUrl },
    };
  } catch (error) {
    console.error("Error setting featured image:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

