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

    // Update the provider profile
    const { error: updateError } = await supabase
      .from("catering_providers")
      .update(updateData)
      .eq("user_id", user.id);

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

