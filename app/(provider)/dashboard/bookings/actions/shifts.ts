"use server";

import { TablesInsert } from "@/database.types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Create a new shift assignment for a booking
 * Assigns a team member to a booking with optional scheduled times
 */
export async function createShift(params: {
  bookingId: string;
  userId: string;
  role?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    console.log("[createShift] Starting with params:", params);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[createShift] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to create shifts",
      };
    }

    console.log("[createShift] Authenticated user:", user.id);

    // Verify user has access to this booking through provider membership
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, provider_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You must be an active provider member to create shifts",
      };
    }

    // Check role permissions - only owner, admin, manager can create shifts
    const roleHierarchy: Record<string, number> = {
      owner: 1,
      admin: 2,
      manager: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[membership.role] > roleHierarchy.manager) {
      return {
        success: false,
        error: "Only owners, admins, and managers can assign team members to bookings",
      };
    }

    // Verify the booking belongs to the user's provider
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, provider_id")
      .eq("id", params.bookingId)
      .eq("provider_id", membership.provider_id)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: "Booking not found or you don't have access to it",
      };
    }

    // Verify the assigned user is a member of the same provider
    const { data: assignedMember, error: assignedMemberError } = await supabase
      .from("provider_members")
      .select("id, user_id")
      .eq("user_id", params.userId)
      .eq("provider_id", membership.provider_id)
      .eq("status", "active")
      .single();

    if (assignedMemberError || !assignedMember) {
      return {
        success: false,
        error: "The assigned team member is not part of your provider",
      };
    }

    // Check if user already has a shift for this booking
    const { data: existingShift } = await supabase
      .from("shifts")
      .select("id")
      .eq("booking_id", params.bookingId)
      .eq("user_id", params.userId)
      .single();

    if (existingShift) {
      console.log("[createShift] Duplicate shift found:", existingShift);
      return {
        success: false,
        error: "This team member is already assigned to this booking",
      };
    }

    // Create the shift
    const shiftData: TablesInsert<"shifts"> = {
      booking_id: params.bookingId,
      user_id: params.userId,
      role: params.role || null,
      scheduled_start: params.scheduledStart || null,
      scheduled_end: params.scheduledEnd || null,
      notes: params.notes || null,
      status: "scheduled",
    };

    console.log("[createShift] Creating shift with data:", shiftData);

    const { data: shift, error: insertError } = await supabase
      .from("shifts")
      .insert(shiftData)
      .select()
      .single();

    if (insertError) {
      console.error("[createShift] Insert error:", insertError);
      return {
        success: false,
        error: "Failed to create shift. Please try again.",
      };
    }

    console.log("[createShift] Shift created successfully:", shift);

    // Revalidate the bookings page
    revalidatePath("/dashboard/bookings");

    return {
      success: true,
      data: shift,
    };
  } catch (error) {
    console.error("[createShift] Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Record check-in time for a shift
 * Sets actual_start to current timestamp
 */
export async function checkIn(shiftId: string): Promise<ActionResult> {
  try {
    console.log("[checkIn] Starting check-in for shift:", shiftId);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[checkIn] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to check in",
      };
    }

    console.log("[checkIn] Authenticated user:", user.id);

    // Get the shift and verify access
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, booking_id, user_id, actual_start, status")
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return {
        success: false,
        error: "Shift not found",
      };
    }

    // Verify user has access through provider membership
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You must be an active provider member",
      };
    }

    // Verify the shift's booking belongs to the user's provider
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("provider_id")
      .eq("id", shift.booking_id)
      .eq("provider_id", membership.provider_id)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: "You don't have access to this shift",
      };
    }

    // Check if already checked in
    if (shift.actual_start) {
      return {
        success: false,
        error: "This shift has already been checked in",
      };
    }

    // Update the shift with check-in time
    const { error: updateError } = await supabase
      .from("shifts")
      .update({
        actual_start: new Date().toISOString(),
      })
      .eq("id", shiftId);

    if (updateError) {
      console.error("Error checking in:", updateError);
      return {
        success: false,
        error: "Failed to check in. Please try again.",
      };
    }

    // Revalidate the bookings page
    revalidatePath("/dashboard/bookings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in checkIn:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Record check-out time for a shift
 * Sets actual_end to current timestamp
 */
export async function checkOut(shiftId: string): Promise<ActionResult> {
  try {
    console.log("[checkOut] Starting check-out for shift:", shiftId);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[checkOut] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to check out",
      };
    }

    console.log("[checkOut] Authenticated user:", user.id);

    // Get the shift and verify access
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, booking_id, user_id, actual_start, actual_end, status")
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return {
        success: false,
        error: "Shift not found",
      };
    }

    // Verify user has access through provider membership
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You must be an active provider member",
      };
    }

    // Verify the shift's booking belongs to the user's provider
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("provider_id")
      .eq("id", shift.booking_id)
      .eq("provider_id", membership.provider_id)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: "You don't have access to this shift",
      };
    }

    // Check if checked in
    if (!shift.actual_start) {
      return {
        success: false,
        error: "Cannot check out before checking in",
      };
    }

    // Check if already checked out
    if (shift.actual_end) {
      return {
        success: false,
        error: "This shift has already been checked out",
      };
    }

    // Update the shift with check-out time
    const { error: updateError } = await supabase
      .from("shifts")
      .update({
        actual_end: new Date().toISOString(),
      })
      .eq("id", shiftId);

    if (updateError) {
      console.error("Error checking out:", updateError);
      return {
        success: false,
        error: "Failed to check out. Please try again.",
      };
    }

    // Revalidate the bookings page
    revalidatePath("/dashboard/bookings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in checkOut:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a shift assignment
 * Only allows deletion if shift hasn't been checked in yet
 */
export async function deleteShift(shiftId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to delete shifts",
      };
    }

    // Get the shift and verify access
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, booking_id, actual_start, status")
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return {
        success: false,
        error: "Shift not found",
      };
    }

    // Verify user has access through provider membership
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("provider_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You must be an active provider member",
      };
    }

    // Check role permissions - only owner, admin, manager can delete shifts
    const roleHierarchy: Record<string, number> = {
      owner: 1,
      admin: 2,
      manager: 3,
      staff: 4,
      viewer: 5,
    };

    if (roleHierarchy[membership.role] > roleHierarchy.manager) {
      return {
        success: false,
        error: "Only owners, admins, and managers can remove team members from bookings",
      };
    }

    // Verify the shift's booking belongs to the user's provider
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("provider_id")
      .eq("id", shift.booking_id)
      .eq("provider_id", membership.provider_id)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: "You don't have access to this shift",
      };
    }

    // Prevent deletion if shift has been checked in
    if (shift.actual_start) {
      return {
        success: false,
        error: "Cannot delete a shift that has been checked in",
      };
    }

    // Delete the shift
    const { error: deleteError } = await supabase
      .from("shifts")
      .delete()
      .eq("id", shiftId);

    if (deleteError) {
      console.error("Error deleting shift:", deleteError);
      return {
        success: false,
        error: "Failed to delete shift. Please try again.",
      };
    }

    // Revalidate the bookings page
    revalidatePath("/dashboard/bookings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteShift:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

