import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/api/membership";
import { APIErrors } from "@/lib/api/errors";

/**
 * GET /api/providers/[providerId]/locations
 * Fetch all service locations for a provider
 * 
 * Returns:
 * - Array of service locations with geographic and capacity information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const supabase = await createClient();

    // Verify membership
    const membership = await getCurrentMembership(providerId);
    if (!membership) {
      throw APIErrors.FORBIDDEN("You are not a member of this provider");
    }

    // Fetch service locations
    const { data: locations, error } = await supabase
      .from("service_locations")
      .select("*")
      .eq("provider_id", providerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching service locations:", error);
      throw APIErrors.INTERNAL_ERROR("Failed to fetch service locations");
    }

    return NextResponse.json(locations || []);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Unexpected error in GET /api/providers/[providerId]/locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers/[providerId]/locations
 * Create a new service location
 * 
 * Body:
 * - province: string
 * - city: string
 * - barangay: string
 * - street_address?: string
 * - postal_code?: string
 * - landmark?: string
 * - service_area_notes?: string
 * - service_radius?: number
 * - is_primary?: boolean
 * - daily_capacity?: number
 * - max_concurrent_events?: number
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const supabase = await createClient();

    // Verify membership and permissions
    const membership = await getCurrentMembership(providerId);
    if (!membership) {
      throw APIErrors.FORBIDDEN("You are not a member of this provider");
    }

    // Only managers and above can create locations
    if (!membership.capabilities.canManageTeam) {
      throw APIErrors.FORBIDDEN("You do not have permission to create service locations");
    }

    const body = await request.json();

    // Validate required fields
    if (!body.province || !body.city || !body.barangay) {
      throw APIErrors.BAD_REQUEST("Province, city, and barangay are required");
    }

    // If setting as primary, unset other primary locations first
    if (body.is_primary) {
      const { error: updateError } = await supabase
        .from("service_locations")
        .update({ is_primary: false })
        .eq("provider_id", providerId)
        .eq("is_primary", true);

      if (updateError) {
        console.error("Error updating primary locations:", updateError);
        throw APIErrors.INTERNAL_ERROR("Failed to update primary location");
      }
    }

    // Create the location
    const { data: location, error } = await supabase
      .from("service_locations")
      .insert({
        provider_id: providerId,
        province: body.province,
        city: body.city,
        barangay: body.barangay,
        street_address: body.street_address || null,
        postal_code: body.postal_code || null,
        landmark: body.landmark || null,
        service_area_notes: body.service_area_notes || null,
        service_radius: body.service_radius || null,
        is_primary: body.is_primary || false,
        daily_capacity: body.daily_capacity || null,
        max_concurrent_events: body.max_concurrent_events || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating service location:", error);
      throw APIErrors.INTERNAL_ERROR("Failed to create service location");
    }

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Unexpected error in POST /api/providers/[providerId]/locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

