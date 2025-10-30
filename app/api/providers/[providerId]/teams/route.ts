import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { APIErrors, handleAPIError } from "@/lib/api/errors";

/**
 * GET /api/providers/[providerId]/teams
 * Fetch all operational teams for a provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify user is a member of this provider (any role can view teams)
    const { data: currentMember, error: memberError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", providerId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memberError || !currentMember) {
      throw APIErrors.FORBIDDEN("You are not an active member of this provider");
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const serviceLocationId = searchParams.get("service_location_id");

    // Build query
    let query = supabase
      .from("teams")
      .select(`
        *,
        service_location:service_locations(
          id,
          province,
          city,
          barangay,
          is_primary
        )
      `)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (serviceLocationId) {
      query = query.eq("service_location_id", serviceLocationId);
    }

    const { data: teams, error: teamsError } = await query;

    if (teamsError) {
      throw APIErrors.INTERNAL("Failed to fetch teams");
    }

    // Fetch member counts for each team
    const teamsWithCounts = await Promise.all(
      (teams || []).map(async (team) => {
        const { count, error: countError } = await supabase
          .from("provider_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id)
          .eq("status", "active");

        if (countError) {
          console.error("Error fetching team member count:", countError);
        }

        return {
          ...team,
          member_count: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: teamsWithCounts,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/providers/[providerId]/teams
 * Create a new operational team
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify user is a manager or above
    const { data: currentMember, error: memberError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", providerId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memberError || !currentMember) {
      throw APIErrors.FORBIDDEN("You are not an active member of this provider");
    }

    if (!["owner", "admin", "manager"].includes(currentMember.role)) {
      throw APIErrors.FORBIDDEN("Only managers and above can create teams");
    }

    // Parse request body
    const body = await request.json();
    const {
      service_location_id,
      name,
      description,
      daily_capacity,
      max_concurrent_events,
    } = body;

    // Validate required fields
    if (!service_location_id || !name) {
      throw APIErrors.INVALID_INPUT("service_location_id and name are required");
    }

    // Verify service location belongs to this provider
    const { data: location, error: locationError } = await supabase
      .from("service_locations")
      .select("id, provider_id")
      .eq("id", service_location_id)
      .eq("provider_id", providerId)
      .single();

    if (locationError || !location) {
      throw APIErrors.INVALID_INPUT("Invalid service location");
    }

    // Create team
    const { data: team, error: createError } = await supabase
      .from("teams")
      .insert({
        provider_id: providerId,
        service_location_id,
        name: name.trim(),
        description: description?.trim() || null,
        daily_capacity: daily_capacity || null,
        max_concurrent_events: max_concurrent_events || null,
        status: "active",
        created_by: user.id,
      })
      .select(`
        *,
        service_location:service_locations(
          id,
          province,
          city,
          barangay,
          is_primary
        )
      `)
      .single();

    if (createError) {
      // Check for unique constraint violation
      if (createError.code === "23505") {
        throw APIErrors.CONFLICT("A team with this name already exists at this location");
      }
      throw APIErrors.INTERNAL("Failed to create team");
    }

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        member_count: 0,
      },
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}

