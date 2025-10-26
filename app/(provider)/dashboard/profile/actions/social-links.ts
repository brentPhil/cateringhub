"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export type SocialPlatform = "facebook" | "instagram" | "website" | "tiktok";

export interface SocialLinkInput {
  id?: string; // Optional for new links
  platform: SocialPlatform;
  url: string;
}

/**
 * Save multiple social links for a provider
 * Handles create, update, and delete operations in a single transaction
 */
export async function saveSocialLinks(
  providerId: string,
  links: SocialLinkInput[]
) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Verify user owns this provider (check team membership)
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id, role, status")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "Provider not found or access denied",
      };
    }

    // Check if user has edit permissions (owner, admin, or manager)
    const roleHierarchy: Record<string, number> = {
      owner: 1,
      admin: 2,
      manager: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[membership.role] > roleHierarchy['manager']) {
      return {
        success: false,
        error: "You do not have permission to edit social links",
      };
    }

    // Get existing social links
    const { data: existingLinks, error: fetchError } = await supabase
      .from("provider_social_links")
      .select("id, platform")
      .eq("provider_id", providerId);

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch existing links: ${fetchError.message}`,
      };
    }

    // Get existing link IDs from database
    const existingLinkIds = (existingLinks || []).map((l) => l.id);

    // Determine which links to delete (existing links not in the new list)
    // Only consider IDs that actually exist in the database
    const newLinkIds = links
      .map((l) => l.id)
      .filter((id) => id && existingLinkIds.includes(id));
    const linksToDelete = (existingLinks || []).filter(
      (existing) => !newLinkIds.includes(existing.id)
    );

    // Delete removed links
    if (linksToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("provider_social_links")
        .delete()
        .in(
          "id",
          linksToDelete.map((l) => l.id)
        );

      if (deleteError) {
        return {
          success: false,
          error: `Failed to delete links: ${deleteError.message}`,
        };
      }
    }

    // Separate new links from existing links
    const linksToUpdate = links.filter((link) =>
      link.id && existingLinkIds.includes(link.id)
    );
    const linksToInsert = links.filter(
      (link) => !link.id || !existingLinkIds.includes(link.id)
    );

    // Update existing links
    if (linksToUpdate.length > 0) {
      const updates: TablesUpdate<"provider_social_links">[] = linksToUpdate.map(
        (link) => ({
          id: link.id!,
          provider_id: providerId, // Required for RLS WITH CHECK clause
          platform: link.platform,
          url: link.url,
        })
      );

      const { error: updateError } = await supabase
        .from("provider_social_links")
        .upsert(updates, {
          onConflict: "id",
        });

      if (updateError) {
        return {
          success: false,
          error: `Failed to update links: ${updateError.message}`,
        };
      }
    }

    // Insert new links
    if (linksToInsert.length > 0) {
      const inserts: TablesInsert<"provider_social_links">[] =
        linksToInsert.map((link) => ({
          provider_id: providerId,
          platform: link.platform,
          url: link.url,
        }));

      const { error: insertError } = await supabase
        .from("provider_social_links")
        .insert(inserts);

      if (insertError) {
        return {
          success: false,
          error: `Failed to insert links: ${insertError.message}`,
        };
      }
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Social links saved successfully",
    };
  } catch (error) {
    console.error("Error saving social links:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete a social link
 */
export async function deleteSocialLink(linkId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Delete the link (RLS will ensure user owns it)
    const { error: deleteError } = await supabase
      .from("provider_social_links")
      .delete()
      .eq("id", linkId);

    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete link: ${deleteError.message}`,
      };
    }

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Social link deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting social link:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

