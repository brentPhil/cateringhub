import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

// Type for unified team member (staff or worker)
export type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  status: string;
  member_type: "staff" | "worker";
  email?: string | null;
  phone?: string | null;
  hourly_rate?: number | null;
  tags?: string[] | null;
};

/**
 * GET /api/providers/[providerId]/teams/[teamId]/members
 * Fetch all members (staff + workers) assigned to a specific team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string; teamId: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId, teamId } = params;

    // Verify user is a member of the provider
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", providerId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have access to this provider" },
        { status: 403 }
      );
    }

    // Verify team belongs to the provider
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, provider_id, name")
      .eq("id", teamId)
      .eq("provider_id", providerId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found or doesn't belong to this provider" },
        { status: 404 }
      );
    }

    // Fetch staff members assigned to this team
    const { data: staffMembers, error: staffError } = await supabase
      .from("provider_members")
      .select("id, user_id, role, status")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (staffError) {
      console.error("[GET /teams/members] Error fetching staff:", staffError);
      return NextResponse.json(
        { error: "Failed to fetch staff members" },
        { status: 500 }
      );
    }

    // Fetch user profiles for staff members
    const staffUserIds = staffMembers
      .map((m) => m.user_id)
      .filter((id): id is string => id !== null);

    const { data: staffProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", staffUserIds);

    if (profilesError) {
      console.error(
        "[GET /teams/members] Error fetching profiles:",
        profilesError
      );
    }

    // Fetch workers assigned to this team
    const { data: workers, error: workersError } = await supabase
      .from("worker_profiles")
      .select("id, name, role, status, phone, hourly_rate, tags")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (workersError) {
      console.error("[GET /teams/members] Error fetching workers:", workersError);
      return NextResponse.json(
        { error: "Failed to fetch workers" },
        { status: 500 }
      );
    }

    // Map staff members to unified format
    const staffTeamMembers: TeamMember[] = staffMembers.map((member) => {
      const profile = staffProfiles?.find((p) => p.id === member.user_id);
      return {
        id: member.id,
        name: profile?.full_name || profile?.email || "Unknown",
        role: member.role,
        status: member.status,
        member_type: "staff" as const,
        email: profile?.email,
        phone: null,
        hourly_rate: null,
        tags: null,
      };
    });

    // Map workers to unified format
    const workerTeamMembers: TeamMember[] = workers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      status: worker.status,
      member_type: "worker" as const,
      email: null,
      phone: worker.phone,
      hourly_rate: worker.hourly_rate,
      tags: worker.tags,
    }));

    // Combine and return all team members
    const allMembers: TeamMember[] = [
      ...staffTeamMembers,
      ...workerTeamMembers,
    ];

    return NextResponse.json({
      members: allMembers,
      team: {
        id: team.id,
        name: team.name,
      },
      counts: {
        total: allMembers.length,
        staff: staffTeamMembers.length,
        workers: workerTeamMembers.length,
      },
    });
  } catch (error) {
    console.error("[GET /teams/members] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

