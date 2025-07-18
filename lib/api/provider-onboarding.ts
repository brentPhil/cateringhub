"use client";

import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import {
  providerBusinessInfoSchema,
  providerServiceDetailsSchema,
  providerContactInfoSchema,
} from "@/lib/validations";

// Combined onboarding data type
export type ProviderOnboardingData = z.infer<typeof providerBusinessInfoSchema> &
  z.infer<typeof providerServiceDetailsSchema> &
  z.infer<typeof providerContactInfoSchema>;

// File upload function
export async function uploadFile(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Create catering provider profile
export async function createCateringProvider(
  data: ProviderOnboardingData
): Promise<void> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  let logoUrl: string | null = null;
  let sampleMenuUrl: string | null = null;

  try {
    // Upload logo if provided
    if (data.logo instanceof File) {
      const logoPath = `logos/${user.id}/${Date.now()}-${data.logo.name}`;
      logoUrl = await uploadFile(data.logo, 'provider-assets', logoPath);
    }

    // Upload sample menu if provided
    if (data.sampleMenu instanceof File) {
      const menuPath = `menus/${user.id}/${Date.now()}-${data.sampleMenu.name}`;
      sampleMenuUrl = await uploadFile(data.sampleMenu, 'provider-assets', menuPath);
    }

    // Insert catering provider data
    const { error: insertError } = await supabase
      .from('catering_providers')
      .insert({
        user_id: user.id,
        business_name: data.businessName,
        business_address: data.businessAddress || null,
        logo_url: logoUrl,
        description: data.description,
        service_areas: data.serviceAreas,
        sample_menu_url: sampleMenuUrl,
        contact_person_name: data.contactPersonName,
        mobile_number: data.mobileNumber,
        social_media_links: data.socialMediaLinks || {},
        onboarding_completed: true,
        onboarding_step: 3,
      });

    if (insertError) {
      throw new Error(`Failed to create provider profile: ${insertError.message}`);
    }

    // Update user role to catering_provider
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'catering_provider',
        provider_role: 'owner'
      });

    if (roleError) {
      // If role already exists, update it
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({
          role: 'catering_provider',
          provider_role: 'owner'
        })
        .eq('user_id', user.id);

      if (updateRoleError) {
        throw new Error(`Failed to update user role: ${updateRoleError.message}`);
      }
    }

  } catch (error) {
    // Clean up uploaded files if provider creation fails
    if (logoUrl) {
      try {
        const logoPath = logoUrl.split('/').pop();
        if (logoPath) {
          await supabase.storage
            .from('provider-assets')
            .remove([`logos/${user.id}/${logoPath}`]);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup logo file:', cleanupError);
      }
    }

    if (sampleMenuUrl) {
      try {
        const menuPath = sampleMenuUrl.split('/').pop();
        if (menuPath) {
          await supabase.storage
            .from('provider-assets')
            .remove([`menus/${user.id}/${menuPath}`]);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup menu file:', cleanupError);
      }
    }

    throw error;
  }
}

// Check if user is already a catering provider
export async function checkExistingProvider(): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from('catering_providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return !error && !!data;
}

// Get provider onboarding progress
export async function getOnboardingProgress(): Promise<{
  step: number;
  completed: boolean;
  data?: Partial<ProviderOnboardingData>;
}> {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from('catering_providers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // No existing provider data
    return { step: 1, completed: false };
  }

  return {
    step: data.onboarding_step || 1,
    completed: data.onboarding_completed || false,
    data: {
      businessName: data.business_name,
      businessAddress: data.business_address,
      description: data.description,
      serviceAreas: data.service_areas,
      contactPersonName: data.contact_person_name,
      mobileNumber: data.mobile_number,
      socialMediaLinks: data.social_media_links,
    }
  };
}
