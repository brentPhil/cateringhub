"use client";

import {
  useQueryStates,
  parseAsString,
  parseAsBoolean,
  parseAsInteger,
  parseAsArrayOf,
} from "nuqs";
import { useMemo } from "react";
import type { ProviderProfile } from "./use-provider-profile";

export interface ProfileFormState {
  businessName: string;
  contactPersonName: string;
  mobileNumber: string;
  email: string;
  tagline: string;
  description: string;
  // Availability fields
  profileVisible: boolean;
  maxServiceRadius: number;
  dailyCapacity: number;
  advanceBookingDays: number;
  selectedDays: string[];
}

export interface UseProfileFormStateReturn {
  formData: ProfileFormState;
  setFormState: (
    values: Partial<ProfileFormState>
  ) => Promise<URLSearchParams>;
  isDirty: boolean;
  resetForm: () => Promise<URLSearchParams>;
  // Individual setters for components
  setProfileVisible: (value: boolean) => void;
  setMaxServiceRadius: (value: number) => void;
  setDailyCapacity: (value: number) => void;
  setAdvanceBookingDays: (value: number) => void;
  setSelectedDays: (value: string[]) => void;
}

/**
 * Custom hook to manage profile form state using nuqs (URL query parameters)
 * Uses single useQueryStates hook for better performance and cleaner code
 */
export function useProfileFormState(
  initialProfile: ProviderProfile | null
): UseProfileFormStateReturn {
  // console.log("🟡 [FORM STATE] Hook initialized with profile:", initialProfile);

  // Use single useQueryStates hook to manage all form fields including availability
  const [formState, setFormState] = useQueryStates({
    // No defaults here; URL params are only for temporary overrides
    businessName: parseAsString,
    contactPersonName: parseAsString,
    mobileNumber: parseAsString,
    email: parseAsString,
    tagline: parseAsString,
    description: parseAsString,
    // Availability fields
    profileVisible: parseAsBoolean,
    maxServiceRadius: parseAsInteger,
    dailyCapacity: parseAsInteger,
    advanceBookingDays: parseAsInteger,
    selectedDays: parseAsArrayOf(parseAsString),
  });

  // Convert to ProfileFormState format by merging URL overrides with backend data
  const formData: ProfileFormState = useMemo(() => {
    const data = {
      businessName: formState.businessName ?? (initialProfile?.business_name || ""),
      contactPersonName:
        formState.contactPersonName ?? (initialProfile?.contact_person_name || ""),
      mobileNumber: formState.mobileNumber ?? (initialProfile?.mobile_number || ""),
      email: formState.email ?? (initialProfile?.email || ""),
      tagline: formState.tagline ?? (initialProfile?.tagline || ""),
      description: formState.description ?? (initialProfile?.description || ""),
      // Availability fields
      profileVisible:
        formState.profileVisible ?? (initialProfile?.is_visible ?? true),
      maxServiceRadius:
        formState.maxServiceRadius ?? (initialProfile?.max_service_radius ?? 100),
      dailyCapacity: formState.dailyCapacity ?? (initialProfile?.daily_capacity ?? 3),
      advanceBookingDays:
        formState.advanceBookingDays ?? (initialProfile?.advance_booking_days ?? 7),
      selectedDays: formState.selectedDays ?? (initialProfile?.available_days ?? []),
    };
    // console.log("🟡 [FORM STATE] Form data computed:", data);
    return data;
  }, [formState, initialProfile]);

  // Check if form is dirty by comparing with initial profile data
  const isDirty = useMemo(() => {
    if (!initialProfile) {
      // console.log("🟡 [FORM STATE] isDirty: false (no initial profile)");
      return false;
    }

    // Helper to compare arrays
    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };

    const dirty =
      formData.businessName !== (initialProfile.business_name || "") ||
      formData.contactPersonName !==
        (initialProfile.contact_person_name || "") ||
      formData.mobileNumber !== (initialProfile.mobile_number || "") ||
      formData.email !== (initialProfile.email || "") ||
      formData.tagline !== (initialProfile.tagline || "") ||
      formData.description !== (initialProfile.description || "") ||
      // Availability fields
      formData.profileVisible !== (initialProfile.is_visible ?? true) ||
      formData.maxServiceRadius !== (initialProfile.max_service_radius ?? 100) ||
      formData.dailyCapacity !== (initialProfile.daily_capacity ?? 3) ||
      formData.advanceBookingDays !==
        (initialProfile.advance_booking_days ?? 7) ||
      !arraysEqual(formData.selectedDays, initialProfile.available_days ?? []);

    // console.log("🟡 [FORM STATE] isDirty:", dirty);
    // console.log("🟡 [FORM STATE] Comparing formData:", formData);
    // console.log("🟡 [FORM STATE] With initialProfile:", initialProfile);

    return dirty;
  }, [formData, initialProfile]);

  // Reset form to initial values by clearing all URL params
  // This makes the form fall back to the defaults from initialProfile
  const resetForm = async () => {
    // console.log("🟡 [FORM STATE] resetForm called - clearing all URL params");

    // Clear all URL params by setting everything to null
    // This will make the form use the defaults from initialProfile
    const result = await setFormState({
      businessName: null,
      contactPersonName: null,
      mobileNumber: null,
      email: null,
      tagline: null,
      description: null,
      profileVisible: null,
      maxServiceRadius: null,
      dailyCapacity: null,
      advanceBookingDays: null,
      selectedDays: null,
    });

    // console.log("🟡 [FORM STATE] Reset complete, URL params cleared");

    return result;
  };

  // Individual setters for components
  const setProfileVisible = (value: boolean) => {
    setFormState({ profileVisible: value });
  };

  const setMaxServiceRadius = (value: number) => {
    setFormState({ maxServiceRadius: value });
  };

  const setDailyCapacity = (value: number) => {
    setFormState({ dailyCapacity: value });
  };

  const setAdvanceBookingDays = (value: number) => {
    setFormState({ advanceBookingDays: value });
  };

  const setSelectedDays = (value: string[]) => {
    setFormState({ selectedDays: value });
  };

  return {
    formData,
    setFormState,
    isDirty,
    resetForm,
    // Individual setters
    setProfileVisible,
    setMaxServiceRadius,
    setDailyCapacity,
    setAdvanceBookingDays,
    setSelectedDays,
  };
}

