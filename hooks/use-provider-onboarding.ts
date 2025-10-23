"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { authKeys } from "@/hooks/use-auth";
import type { ProviderOnboardingFormData } from '@/types/form.types';

// Types - use consolidated type from form.types.ts
export type ProviderOnboardingData = ProviderOnboardingFormData;

// Simple onboarding data type for the streamlined flow
export interface SimpleProviderOnboardingData {
  businessName: string;
  description: string;
  serviceAreas: string; // comma-separated string in simple form
  contactPersonName: string;
  mobileNumber: string;
}

export interface OnboardingProgress {
  step: number;
  completed: boolean;
  data?: Partial<ProviderOnboardingData>;
}

export interface CreateProviderResponse {
  success: boolean;
  providerId?: string;
  message?: string;
}

// Query Keys
export const providerOnboardingKeys = {
  all: ['provider-onboarding'] as const,
  status: () => [...providerOnboardingKeys.all, 'status'] as const,
  progress: () => [...providerOnboardingKeys.all, 'progress'] as const,
} as const;

// Helper function to safely check if value is a File instance
const isFileInstance = (value: any): value is File => {
  return typeof File !== "undefined" && value instanceof File;
};

// File upload function
export async function uploadFile(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient();

  // Sanitize the file path to remove spaces and special characters
  const sanitizedPath = path.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.\/]/g, '');

  console.log('Uploading file:', {
    originalPath: path,
    sanitizedPath,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(sanitizedPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  console.log('File uploaded successfully:', urlData.publicUrl);
  return urlData.publicUrl;
}

// Enhanced API Functions with better error handling and progress tracking
export async function createCateringProvider(
  data: ProviderOnboardingData | SimpleProviderOnboardingData
): Promise<CreateProviderResponse> {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Determine if this is simple or full onboarding data
  const isSimpleData = !('logo' in data) && !('sampleMenu' in data);

  // Backend validation using the appropriate schema based on data type
  const { simpleProviderOnboardingSchema, providerOnboardingSchema } = await import("@/lib/validations");
  const validationSchema = isSimpleData ? simpleProviderOnboardingSchema : providerOnboardingSchema;
  const validationResult = validationSchema.safeParse(data);

  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Check if provider already exists
  const existingProvider = await checkExistingProvider();
  if (existingProvider) {
    throw new Error("Provider profile already exists");
  }

  // Additional business logic validation
  const serviceAreasArray = Array.isArray(data.serviceAreas)
    ? data.serviceAreas
    : data.serviceAreas.split(',').map((area: string) => area.trim()).filter((area: string) => area.length > 0);

  if (serviceAreasArray.length === 0) {
    throw new Error("At least one service area is required");
  }

  if (serviceAreasArray.length > 10) {
    throw new Error("Maximum 10 service areas allowed");
  }

  let logoUrl: string | null = null;
  let sampleMenuUrl: string | null = null;
  let providerData: any = null;
  let rollbackActions: (() => Promise<void>)[] = [];

  try {
    // Step 1: Upload files first (if provided) - only for full onboarding
    if (!isSimpleData) {
      const fullData = data as ProviderOnboardingFormData;

      if (isFileInstance(fullData.logo)) {
        const logoPath = `logos/${user.id}/${Date.now()}-${fullData.logo.name}`;
        logoUrl = await uploadFile(fullData.logo, 'provider-assets', logoPath);

        // Add rollback action for logo
        rollbackActions.push(async () => {
          try {
            const fileName = logoPath.split('/').pop();
            if (fileName) {
              await supabase.storage
                .from('provider-assets')
                .remove([logoPath]);
            }
          } catch (error) {
            console.warn('Failed to cleanup logo file:', error);
          }
        });
      }

      if (isFileInstance(fullData.sampleMenu)) {
        const menuPath = `menus/${user.id}/${Date.now()}-${fullData.sampleMenu.name}`;
        sampleMenuUrl = await uploadFile(fullData.sampleMenu, 'provider-assets', menuPath);

        // Add rollback action for menu
        rollbackActions.push(async () => {
          try {
            const fileName = menuPath.split('/').pop();
            if (fileName) {
              await supabase.storage
                .from('provider-assets')
                .remove([menuPath]);
            }
          } catch (error) {
            console.warn('Failed to cleanup menu file:', error);
          }
        });
      }
    }

    // Step 2: Create provider profile with progress tracking
    const insertData = {
      user_id: user.id,
      business_name: data.businessName,
      business_address: isSimpleData ? null : (data as ProviderOnboardingFormData).businessAddress || null,
      logo_url: logoUrl,
      description: data.description,
      service_areas: serviceAreasArray,
      sample_menu_url: sampleMenuUrl,
      contact_person_name: data.contactPersonName,
      mobile_number: data.mobileNumber,
      social_media_links: isSimpleData ? {} : (data as ProviderOnboardingFormData).socialMediaLinks || {},
      onboarding_completed: true,
      onboarding_step: 3,
    };

    const { data: insertedProvider, error: insertError } = await supabase
      .from('catering_providers')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError) {
      // Check for specific error types
      if (insertError.code === '23505') { // Unique constraint violation
        throw new Error("Provider profile already exists for this user");
      }
      throw new Error(`Failed to create provider profile: ${insertError.message}`);
    }

    providerData = insertedProvider;

    // Add rollback action for provider
    rollbackActions.push(async () => {
      try {
        await supabase
          .from('catering_providers')
          .delete()
          .eq('id', providerData.id);
      } catch (error) {
        console.warn('Failed to cleanup provider profile:', error);
      }
    });

    // Step 3: User role is now managed through provider_members table
    // No need to update user_roles table (removed with RBAC system)

    return {
      success: true,
      providerId: providerData.id,
      message: "Provider profile created successfully"
    };

  } catch (error) {
    // Execute all rollback actions in reverse order
    for (const rollback of rollbackActions.reverse()) {
      await rollback();
    }

    // Re-throw the original error with enhanced context
    if (error instanceof Error) {
      throw new Error(`Onboarding failed: ${error.message}`);
    }
    throw new Error("Onboarding failed due to an unknown error");
  }
}

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
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no rows found

  // If error and it's not a "no rows" error, log it
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing provider:', error);
  }

  return !error && !!data;
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
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

// New function to save progress during onboarding
export async function saveOnboardingProgress(
  step: number,
  data: Partial<ProviderOnboardingData>
): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Upsert progress data
  const { error } = await supabase
    .from('catering_providers')
    .upsert({
      user_id: user.id,
      business_name: data.businessName || '',
      business_address: data.businessAddress || null,
      description: data.description || '',
      service_areas: data.serviceAreas || [],
      contact_person_name: data.contactPersonName || '',
      mobile_number: data.mobileNumber || '',
      social_media_links: data.socialMediaLinks || {},
      onboarding_step: step,
      onboarding_completed: false,
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    throw new Error(`Failed to save progress: ${error.message}`);
  }
}

// Function to clean up incomplete onboarding data
export async function cleanupIncompleteOnboarding(): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Delete incomplete provider data
  const { error: deleteError } = await supabase
    .from('catering_providers')
    .delete()
    .eq('user_id', user.id)
    .eq('onboarding_completed', false);

  if (deleteError) {
    console.warn('Failed to cleanup incomplete onboarding:', deleteError);
  }

  // Clean up any uploaded files for incomplete onboarding
  try {
    const { data: files } = await supabase.storage
      .from('provider-assets')
      .list(`logos/${user.id}`);

    if (files && files.length > 0) {
      const filePaths = files.map(file => `logos/${user.id}/${file.name}`);
      await supabase.storage
        .from('provider-assets')
        .remove(filePaths);
    }

    const { data: menuFiles } = await supabase.storage
      .from('provider-assets')
      .list(`menus/${user.id}`);

    if (menuFiles && menuFiles.length > 0) {
      const menuPaths = menuFiles.map(file => `menus/${user.id}/${file.name}`);
      await supabase.storage
        .from('provider-assets')
        .remove(menuPaths);
    }
  } catch (cleanupError) {
    console.warn('Failed to cleanup uploaded files:', cleanupError);
  }
}

// Custom Hooks

/**
 * Hook to create a catering provider profile with optimistic updates
 */
export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCateringProvider,
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: providerOnboardingKeys.status() });
      
      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(providerOnboardingKeys.status());
      
      // Optimistically update to show provider status as true
      queryClient.setQueryData(providerOnboardingKeys.status(), true);
      
      return { previousStatus };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(providerOnboardingKeys.status(), context.previousStatus);
      }
      
      // Show error toast
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to create provider profile. Please try again."
      );
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: providerOnboardingKeys.all });

      // Show success toast
      toast.success("Onboarding completed successfully! Welcome to CateringHub!");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: providerOnboardingKeys.status() });
    },
    retry: (failureCount, error) => {
      // Don't retry validation errors or authentication errors
      if (error.message.includes('validation') ||
          error.message.includes('authentication') ||
          error.message.includes('already exists')) {
        return false;
      }

      // Retry network errors up to 3 times
      if (error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('timeout')) {
        return failureCount < 3;
      }

      // Retry other errors once
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to check if user is already a provider
 */
export function useProviderStatus() {
  return useQuery({
    queryKey: providerOnboardingKeys.status(),
    queryFn: checkExistingProvider,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('authentication')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get onboarding progress
 */
export function useOnboardingProgress() {
  return useQuery({
    queryKey: providerOnboardingKeys.progress(),
    queryFn: getOnboardingProgress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('authentication')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
  });
}
