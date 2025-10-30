import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/api/membership";
import { APIErrors } from "@/lib/api/errors";

/**
 * PATCH /api/providers/[providerId]/locations/[locationId]
 * Update a service location
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; locationId: string }> }
) {
  try {
    const { providerId, locationId } = await params;
    const supabase = await createClient();

    // Verify membership and permissions
    const membership = await getCurrentMembership(providerId);
    if (!membership) {
      throw APIErrors.FORBIDDEN("You are not a member of this provider");
    }

    if (!membership.capabilities.canManageTeam) {
      throw APIErrors.FORBIDDEN("You do not have permission to update service locations");
    }

    const body = await request.json();

    // If setting as primary, unset other primary locations first
    if (body.is_primary === true) {
      const { error: updateError } = await supabase
        .from("service_locations")
        .update({ is_primary: false })
        .eq("provider_id", providerId)
        .eq("is_primary", true)
        .neq("id", locationId);

      if (updateError) {
        console.error("Error updating primary locations:", updateError);
        throw APIErrors.INTERNAL_ERROR("Failed to update primary location");
      }
    }

    // Update the location
    const updateData: Record<string, unknown> = {};
    if (body.province !== undefined) updateData.province = body.province;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.barangay !== undefined) updateData.barangay = body.barangay;
    if (body.street_address !== undefined) updateData.street_address = body.street_address || null;
    if (body.postal_code !== undefined) updateData.postal_code = body.postal_code || null;
    if (body.landmark !== undefined) updateData.landmark = body.landmark || null;
    if (body.service_area_notes !== undefined) updateData.service_area_notes = body.service_area_notes || null;
    if (body.service_radius !== undefined) updateData.service_radius = body.service_radius || null;
    if (body.is_primary !== undefined) updateData.is_primary = body.is_primary;
    if (body.daily_capacity !== undefined) updateData.daily_capacity = body.daily_capacity || null;
    if (body.max_concurrent_events !== undefined) updateData.max_concurrent_events = body.max_concurrent_events || null;

    const { data: location, error } = await supabase
      .from("service_locations")
      .update(updateData)
      .eq("id", locationId)
      .eq("provider_id", providerId)
      .select()
      .single();

    if (error) {
      console.error("Error updating service location:", error);
      throw APIErrors.INTERNAL_ERROR("Failed to update service location");
    }

    if (!location) {
      throw APIErrors.NOT_FOUND("Service location");
    }

    return NextResponse.json(location);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Unexpected error in PATCH /api/providers/[providerId]/locations/[locationId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers/[providerId]/locations/[locationId]
 * Delete a service location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; locationId: string }> }
) {
  try {
    const { providerId, locationId } = await params;
    const supabase = await createClient();

    // Verify membership and permissions
    const membership = await getCurrentMembership(providerId);
    if (!membership) {
      throw APIErrors.FORBIDDEN("You are not a member of this provider");
    }

    if (!membership.capabilities.canManageTeam) {
      throw APIErrors.FORBIDDEN("You do not have permission to delete service locations");
    }

    // Check if this is the primary location
    const { data: location } = await supabase
      .from("service_locations")
      .select("is_primary")
      .eq("id", locationId)
      .eq("provider_id", providerId)
      .single();

    if (!location) {
      throw APIErrors.NOT_FOUND("Service location");
    }

    // Check if there are any teams using this location
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("service_location_id", locationId)
      .limit(1);

    if (teamsError) {
      console.error("Error checking teams:", teamsError);
      throw APIErrors.INTERNAL_ERROR("Failed to check location usage");
    }

    if (teams && teams.length > 0) {
      throw APIErrors.BAD_REQUEST("Cannot delete location that is assigned to teams");
    }

    // Prevent deletion of primary location if it's the only one
    if (location.is_primary) {
      const { count } = await supabase
        .from("service_locations")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", providerId);

      if (count && count <= 1) {
        throw APIErrors.BAD_REQUEST("Cannot delete the only service location");
      }
    }

    // Delete the location
    const { error } = await supabase
      .from("service_locations")
      .delete()
      .eq("id", locationId)
      .eq("provider_id", providerId);

    if (error) {
      console.error("Error deleting service location:", error);
      throw APIErrors.INTERNAL_ERROR("Failed to delete service location");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Unexpected error in DELETE /api/providers/[providerId]/locations/[locationId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

