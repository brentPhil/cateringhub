"use server";

import { createClient } from "@/lib/supabase/server";
import { providerProfileFormSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function updateProviderProfile(formData: unknown) {
  try {
    // Validate the form data
    const validatedData = providerProfileFormSchema.parse(formData);

    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update your profile",
      };
    }

    // Check user's membership and permissions
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, provider_id, user_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You are not a member of any provider organization",
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
        error: "You do not have permission to edit the profile. Contact an admin or owner.",
      };
    }

    // Prepare update data
    const updateData = {
      business_name: validatedData.businessName,
      contact_person_name: validatedData.contactPersonName,
      mobile_number: validatedData.mobileNumber,
      description: validatedData.description,
      email: validatedData.email || null,
      tagline: validatedData.tagline || null,
      // Availability fields (optional)
      is_visible: validatedData.profileVisible ?? undefined,
      max_service_radius: validatedData.maxServiceRadius ?? undefined,
      daily_capacity: validatedData.dailyCapacity ?? undefined,
      advance_booking_days: validatedData.advanceBookingDays ?? undefined,
      available_days: validatedData.selectedDays ?? undefined,
      // Social media links (optional)
      social_media_links: validatedData.socialMediaLinks ?? undefined,
      updated_at: new Date().toISOString(),
    };

    // Update the provider profile using provider_id from membership
    // NEW: Query unified providers table instead of catering_providers
    const { error: updateError } = await supabase
      .from("providers")
      .update(updateData)
      .eq("id", membership.provider_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return {
        success: false,
        error: "Failed to update profile. Please try again.",
      };
    }

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

