"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { authKeys } from "@/hooks/use-auth";
import type { ProviderOnboardingFormData } from '@/types/form.types';
import {
  parseOnboardingError,
  getUserErrorMessage,
  ValidationError,
  UnauthorizedError,
  FileUploadError,
} from "@/lib/errors/onboarding-errors";

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

export interface CreateProviderResponse {
  success: boolean;
  providerId?: string;
  message?: string;
}

// Query Keys
export const providerOnboardingKeys = {
  all: ['provider-onboarding'] as const,
  status: () => [...providerOnboardingKeys.all, 'status'] as const,
} as const;

// Helper function to safely check if value is a File instance
const isFileInstance = (value: any): value is File => {
  return typeof File !== "undefined" && value instanceof File;
};

/**
 * Get file extension from filename or MIME type
 */
function getFileExtension(file: File): string {
  // Try to get extension from filename first
  const nameParts = file.name.split('.');
  if (nameParts.length > 1) {
    return nameParts.pop()!.toLowerCase();
  }

  // Fallback to MIME type mapping
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };

  return mimeToExt[file.type] || 'bin';
}

/**
 * Generate deterministic file path for provider assets
 * Format: {type}/{user_id}/{filename}.{ext}
 * This allows safe retries with upsert=true
 */
function getDeterministicFilePath(
  userId: string,
  fileType: 'logo' | 'menu',
  file: File
): string {
  const ext = getFileExtension(file);
  const typeFolder = fileType === 'logo' ? 'logos' : 'menus';
  return `${typeFolder}/${userId}/${fileType}.${ext}`;
}

/**
 * Upload file to Supabase Storage with deterministic path and upsert support
 * This makes uploads idempotent - retries will overwrite the same file
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path: string,
  options: {
    upsert?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<string> {
  const supabase = createClient();
  const { upsert = true, onProgress } = options;

  if (onProgress) onProgress(0);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert,
      contentType: file.type,
    });

  if (error) {
    throw new FileUploadError(`Failed to upload file: ${error.message}`, file.name);
  }

  if (onProgress) onProgress(100);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
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
    throw new UnauthorizedError("User not authenticated");
  }

  // Determine if this is simple or full onboarding data
  const isSimpleData = !('logo' in data) && !('sampleMenu' in data);



  // Additional business logic validation
  const serviceAreasArray = Array.isArray(data.serviceAreas)
    ? data.serviceAreas
    : data.serviceAreas.split(',').map((area: string) => area.trim()).filter((area: string) => area.length > 0);

  if (serviceAreasArray.length === 0) {
    throw new ValidationError("At least one service area is required", "serviceAreas");
  }



  let logoUrl: string | null = null;
  let sampleMenuUrl: string | null = null;
  let providerData: any = null;

  try {
    // Step 1: Upload files first (if provided) - only for full onboarding
    // Using deterministic paths with upsert=true makes this idempotent
    if (!isSimpleData) {
      const fullData = data as ProviderOnboardingFormData;

      if (isFileInstance(fullData.logo)) {
        // Use deterministic path: logos/{user_id}/logo.{ext}
        const logoPath = getDeterministicFilePath(user.id, 'logo', fullData.logo);
        logoUrl = await uploadFile(fullData.logo, 'provider-assets', logoPath, {
          upsert: true, // Allow overwrites on retry
        });
      }

      if (isFileInstance(fullData.sampleMenu)) {
        // Use deterministic path: menus/{user_id}/menu.{ext}
        const menuPath = getDeterministicFilePath(user.id, 'menu', fullData.sampleMenu);
        sampleMenuUrl = await uploadFile(fullData.sampleMenu, 'provider-assets', menuPath, {
          upsert: true, // Allow overwrites on retry
        });
      }
    }

    // Step 2: Create provider profile with membership atomically using RPC

    // Convert social media links (object) to JSONB format if provided
    let socialMediaLinksJson: Record<string, string> | null = null;
    if (!isSimpleData) {
      const links = (data as ProviderOnboardingFormData).socialMediaLinks;
      if (links) {
        const obj: Record<string, string> = {};
        if (links.facebook) obj.facebook = links.facebook;
        if (links.instagram) obj.instagram = links.instagram;
        if (links.website) obj.website = links.website;
        socialMediaLinksJson = Object.keys(obj).length ? obj : null;
      }
    }

    const rpcParams = {
      p_user_id: user.id,
      p_business_name: data.businessName,
      p_description: data.description,
      p_contact_person_name: data.contactPersonName,
      p_mobile_number: data.mobileNumber,
      p_business_address: isSimpleData ? null : (data as ProviderOnboardingFormData).businessAddress || null,
      p_logo_url: logoUrl,
      p_service_areas: serviceAreasArray,
      p_sample_menu_url: sampleMenuUrl,
      p_social_links: socialMediaLinksJson,
      p_client_ip: null, // Could be populated from request headers in the future
      p_onboarding_completed: true,
      p_onboarding_step: 3,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 [ONBOARDING] Calling create_provider_with_membership RPC:', {
        userId: user.id,
        businessName: data.businessName,
      });
    }

    const { data: result, error: insertError } = await supabase
      .rpc('create_provider_with_membership', rpcParams);

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [ONBOARDING] RPC error:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
      }
      // Centralized minimal parsing: handles duplicates (23505) and unauthorized
      throw parseOnboardingError(insertError);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [ONBOARDING] RPC success:', {
        providerId: result?.provider_id,
      });
    }

    if (!result || !result.provider_id) {
      throw new ValidationError("Failed to create provider profile: No provider ID returned");
    }

    const providerId = result.provider_id;
    providerData = { id: providerId };

    return {
      success: true,
      providerId: providerData.id,
      message: result.message || "Provider profile created successfully"
    };

  } catch (error) {
    // With deterministic file paths and upsert=true, files don't need rollback
    // The RPC handles provider/membership atomically
    // On retry, files will be overwritten and RPC will handle duplicates

    // Parse and re-throw as appropriate custom error
    throw parseOnboardingError(error);
  }
}

/**
 * Check if the current user has an active provider membership
 * Uses the is_provider RPC function to check provider_members table
 * This is the correct way to check provider status after the backend migration
 */
export async function checkExistingProvider(): Promise<boolean> {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [PROVIDER_CHECK] No authenticated user', { userError });
    }
    return false;
  }

  try {
    // Use the is_provider RPC function to check for active membership
    // This checks the provider_members table for any active membership
    const { data, error } = await supabase.rpc('is_provider');

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [PROVIDER_CHECK] is_provider RPC result:', {
        userId: user.id,
        hasProviderMembership: data,
        error: error?.message,
      });
    }

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [PROVIDER_CHECK] RPC error:', error);
      }
      return false;
    }

    return data ?? false;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [PROVIDER_CHECK] Unexpected error:', err);
    }
    return false;
  }
}

// Custom Hooks

/**
 * Hook to create a catering provider profile
 * Uses React Query for automatic retries with exponential backoff
 */
export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCateringProvider,
    onError: (error) => {
      // Show user-friendly error message
      const errorMessage = getUserErrorMessage(error);
      toast.error(errorMessage);


    },
    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: providerOnboardingKeys.all });
      queryClient.invalidateQueries({ queryKey: providerOnboardingKeys.status() });

      // Show success toast
      toast.success(data.message || "Onboarding completed successfully! Welcome to CateringHub!");


    },
    // Important: disable retries for create provider to avoid duplicate submissions
    // Server now relies on unique constraints; retries could surface duplicate (23505) errors.
    // Disabling retries prevents accidental duplicates on flaky networks.
    retry: false,
  });
}

/**
 * Hook to check if user has an active provider membership
 * Uses the is_provider RPC function via checkExistingProvider
 * This checks the provider_members table for active membership status
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
