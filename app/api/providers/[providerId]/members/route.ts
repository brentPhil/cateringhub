import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { APIErrors, handleAPIError } from "@/lib/api/errors";

/**
 * GET /api/providers/[providerId]/members
 * Fetch all team members for a provider with user metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const user = await getAuthenticatedUser();
    const supabase = await createClient();

    // Verify user is a member of this provider (any role can view members)
    // Query directly instead of using RPC to avoid potential issues
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

    // Fetch all members
    const { data: members, error: membersError } = await supabase
      .from("provider_members")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false});

    if (membersError) {
      throw APIErrors.DATABASE_ERROR("Failed to fetch team members", membersError);
    }

    // Fetch user metadata for each member from auth.users
    const membersWithUsers = await Promise.all(
      (members || []).map(async (member) => {
        // Query auth.users via the get_user_metadata function
        const { data: authUser, error: userError } = await supabase
          .rpc("get_user_metadata", { user_id: member.user_id })
          .single();

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
      data: membersWithUsers,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

