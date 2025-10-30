import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { APIErrors, handleAPIError } from "@/lib/api/errors";
import type { UserMetadata } from "@/types/api.types";

/**
 * GET /api/providers/[providerId]/teams/[teamId]
 * Fetch details for a specific team
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string; teamId: string }> }
) {
  try {
    const { providerId, teamId } = await params;
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify user is a member of this provider
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

    // Fetch team details
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select(`
        *,
        service_location:service_locations(
          id,
          province,
          city,
          barangay,
          street_address,
          landmark,
          postal_code,
          service_radius,
          is_primary,
          daily_capacity,
          max_concurrent_events
        )
      `)
      .eq("id", teamId)
      .eq("provider_id", providerId)
      .single();

    if (teamError || !team) {
      throw APIErrors.NOT_FOUND("Team not found");
    }

    // Fetch team members
    const { data: members, error: membersError } = await supabase
      .from("provider_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (membersError) {
      throw APIErrors.INTERNAL("Failed to fetch team members");
    }

    // Fetch user metadata for each member
    const membersWithUsers = await Promise.all(
      (members || []).map(async (member) => {
        const { data: authUser, error: userError } = await supabase
          .rpc("get_user_metadata", { user_id: member.user_id })
          .single<UserMetadata>();

        if (userError || !authUser) {
          console.error("Error fetching user metadata:", userError);
          return {
            ...member,
            full_name: "Unknown User",
            email: "",
            avatar_url: undefined,
          };
        }

        const metadata = (authUser.raw_user_meta_data as Record<string, unknown>) || {};

        return {
          ...member,
          full_name: metadata.full_name || authUser.email?.split("@")[0] || "Unknown User",
          email: authUser.email || "",
          avatar_url: metadata.avatar_url,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        members: membersWithUsers,
        member_count: membersWithUsers.length,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * PATCH /api/providers/[providerId]/teams/[teamId]
 * Update team details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; teamId: string }> }
) {
  try {
    const { providerId, teamId } = await params;
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
      throw APIErrors.FORBIDDEN("Only managers and above can update teams");
    }

    // Verify team exists and belongs to this provider
    const { data: existingTeam, error: teamError } = await supabase
      .from("teams")
      .select("id, provider_id")
      .eq("id", teamId)
      .eq("provider_id", providerId)
      .single();

    if (teamError || !existingTeam) {
      throw APIErrors.NOT_FOUND("Team not found");
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      daily_capacity,
      max_concurrent_events,
      status,
    } = body;

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (daily_capacity !== undefined) updates.daily_capacity = daily_capacity || null;
    if (max_concurrent_events !== undefined) updates.max_concurrent_events = max_concurrent_events || null;
    if (status !== undefined) {
      if (!["active", "inactive", "archived"].includes(status)) {
        throw APIErrors.INVALID_INPUT("Invalid status value");
      }
      updates.status = status;
    }

    // Update team
    const { data: team, error: updateError } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId)
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

    if (updateError) {
      // Check for unique constraint violation
      if (updateError.code === "23505") {
        throw APIErrors.CONFLICT("A team with this name already exists at this location");
      }
      throw APIErrors.INTERNAL("Failed to update team");
    }

    // Fetch member count
    const { count } = await supabase
      .from("provider_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "active");

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        member_count: count || 0,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/providers/[providerId]/teams/[teamId]
 * Archive a team (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string; teamId: string }> }
) {
  try {
    const { providerId, teamId } = await params;
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
      throw APIErrors.FORBIDDEN("Only managers and above can delete teams");
    }

    // Verify team exists and belongs to this provider
    const { data: existingTeam, error: teamError } = await supabase
      .from("teams")
      .select("id, provider_id")
      .eq("id", teamId)
      .eq("provider_id", providerId)
      .single();

    if (teamError || !existingTeam) {
      throw APIErrors.NOT_FOUND("Team not found");
    }

    // Soft delete by setting status to 'archived'
    const { error: updateError } = await supabase
      .from("teams")
      .update({ status: "archived" })
      .eq("id", teamId);

    if (updateError) {
      throw APIErrors.INTERNAL("Failed to archive team");
    }

    return NextResponse.json({
      success: true,
      message: "Team archived successfully",
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

