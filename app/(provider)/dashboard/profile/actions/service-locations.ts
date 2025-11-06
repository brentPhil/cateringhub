"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ServiceLocationInput {
  id?: string; // Optional for new locations
  province: string;
  city: string;
  barangay: string;
  streetAddress?: string;
  postalCode?: string;
  isPrimary: boolean;
  landmark?: string;
  notes?: string;
  serviceRadius?: number; // km
}

/**
 * Save multiple service locations for a provider
 * Handles create, update, and delete operations in a single transaction
 */
export async function saveServiceLocations(
  providerId: string,
  locations: ServiceLocationInput[]
) {
  const supabase = await createClient();

  try {
    // Verify user owns this provider
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify provider belongs to user (check team membership)
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id, role, status")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Provider not found or unauthorized" };
    }

    // Check if user has edit permissions (owner or admin)
    const { ROLE_HIERARCHY } = await import('@/lib/roles');
    if (ROLE_HIERARCHY[membership.role as keyof typeof ROLE_HIERARCHY] > ROLE_HIERARCHY['admin']) {
      return { success: false, error: "You do not have permission to edit service locations" };
    }

    // Validate at least one location exists
    if (locations.length === 0) {
      return { success: false, error: "At least one location is required" };
    }

    // Validate exactly one primary location
    const primaryCount = locations.filter((loc) => loc.isPrimary).length;
    if (primaryCount !== 1) {
      return {
        success: false,
        error: "Exactly one location must be marked as primary",
      };
    }

    // Validate required fields
    for (const loc of locations) {
      if (!loc.province || !loc.city || !loc.barangay) {
        return {
          success: false,
          error: "Province, city, and barangay are required for all locations",
        };
      }
    }

    // Get existing locations for this provider
    const { data: existingLocations, error: fetchError } = await supabase
      .from("service_locations")
      .select("id")
      .eq("provider_id", providerId);

    if (fetchError) {
      return { success: false, error: "Failed to fetch existing locations" };
    }

    const existingIds = existingLocations?.map((loc) => loc.id) || [];

    // Filter locations: separate new from existing
    // New locations either have no ID or have a client-generated UUID not in database
    const newLocations = locations.filter((loc) => !loc.id || !existingIds.includes(loc.id));
    const existingLocationsToUpdate = locations.filter((loc) => loc.id && existingIds.includes(loc.id));

    // Get IDs of locations being kept (both new and existing)
    const keptLocationIds = existingLocationsToUpdate.map((loc) => loc.id!);

    // Determine which locations to delete (exist in DB but not in new list)
    const idsToDelete = existingIds.filter((id) => !keptLocationIds.includes(id));

    // Delete removed locations
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_locations")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return { success: false, error: "Failed to delete locations" };
      }
    }

    // Insert new locations (without ID, let database generate)
    if (newLocations.length > 0) {
      const newLocationsData = newLocations.map((loc) => ({
        provider_id: providerId,
        province: loc.province || null,
        city: loc.city || null,
        barangay: loc.barangay || null,
        street_address: loc.streetAddress || null,
        postal_code: loc.postalCode || null,
        is_primary: loc.isPrimary,
        landmark: loc.landmark || null,
        service_area_notes: loc.notes || null,
        service_radius: loc.serviceRadius ?? null,
      }));

      const { error: insertError } = await supabase
        .from("service_locations")
        .insert(newLocationsData);

      if (insertError) {
        console.error("Insert error:", insertError);
        return { success: false, error: "Failed to add new locations" };
      }
    }

    // Update existing locations individually
    if (existingLocationsToUpdate.length > 0) {
      for (const loc of existingLocationsToUpdate) {
        const { error: updateError } = await supabase
          .from("service_locations")
          .update({
            province: loc.province || null,
            city: loc.city || null,
            barangay: loc.barangay || null,
            street_address: loc.streetAddress || null,
            postal_code: loc.postalCode || null,
            is_primary: loc.isPrimary,
            landmark: loc.landmark || null,
            service_area_notes: loc.notes || null,
            service_radius: loc.serviceRadius ?? null,
          })
          .eq("id", loc.id!);

        if (updateError) {
          console.error("Update error:", updateError);
          return { success: false, error: `Failed to update location: ${updateError.message}` };
        }
      }
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return { success: true };
  } catch (error) {
    console.error("Error saving service locations:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a single service location
 * Prevents deleting if it's the only location
 */
export async function deleteServiceLocation(locationId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the location to verify ownership
    const { data: location, error: fetchError } = await supabase
      .from("service_locations")
      .select("provider_id")
      .eq("id", locationId)
      .single();

    if (fetchError || !location) {
      return { success: false, error: "Location not found" };
    }

    // Verify provider belongs to user (check team membership)
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id, role, status")
      .eq("user_id", user.id)
      .eq("provider_id", location.provider_id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has edit permissions (owner or admin)
    const { ROLE_HIERARCHY } = await import('@/lib/roles');
    if (ROLE_HIERARCHY[membership.role as keyof typeof ROLE_HIERARCHY] > ROLE_HIERARCHY['admin']) {
      return { success: false, error: "You do not have permission to delete service locations" };
    }

    // Check if this is the only location
    const { data: allLocations, error: countError } = await supabase
      .from("service_locations")
      .select("id")
      .eq("provider_id", location.provider_id);

    if (countError) {
      return { success: false, error: "Failed to check location count" };
    }

    if (allLocations && allLocations.length <= 1) {
      return {
        success: false,
        error: "Cannot delete the last location. At least one location is required.",
      };
    }

    // Delete the location
    const { error: deleteError } = await supabase
      .from("service_locations")
      .delete()
      .eq("id", locationId);

    if (deleteError) {
      return { success: false, error: "Failed to delete location" };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return { success: true };
  } catch (error) {
    console.error("Error deleting service location:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Set a location as primary (and unset all others for the same provider)
 */
export async function setPrimaryLocation(locationId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the location to verify ownership and get provider_id
    const { data: location, error: fetchError } = await supabase
      .from("service_locations")
      .select("provider_id")
      .eq("id", locationId)
      .single();

    if (fetchError || !location) {
      return { success: false, error: "Location not found" };
    }

    // Verify provider belongs to user (check team membership)
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id, role, status")
      .eq("user_id", user.id)
      .eq("provider_id", location.provider_id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has edit permissions (owner or admin)
    const { ROLE_HIERARCHY } = await import('@/lib/roles');
    if (ROLE_HIERARCHY[membership.role as keyof typeof ROLE_HIERARCHY] > ROLE_HIERARCHY['admin']) {
      return { success: false, error: "You do not have permission to set primary location" };
    }

    // Unset all primary flags for this provider
    const { error: unsetError } = await supabase
      .from("service_locations")
      .update({ is_primary: false })
      .eq("provider_id", location.provider_id);

    if (unsetError) {
      return { success: false, error: "Failed to update locations" };
    }

    // Set this location as primary
    const { error: setPrimaryError } = await supabase
      .from("service_locations")
      .update({ is_primary: true })
      .eq("id", locationId);

    if (setPrimaryError) {
      return { success: false, error: "Failed to set primary location" };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return { success: true };
  } catch (error) {
    console.error("Error setting primary location:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
