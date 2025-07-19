"use client";

import {
  useForm,
  UseFormReturn,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useCallback } from "react";
import {
  providerBusinessInfoSchema,
  providerServiceDetailsSchema,
  providerContactInfoSchema,
  providerOnboardingSchema,
} from "@/lib/validations";
import type { ProviderOnboardingData } from "@/hooks/use-provider-onboarding";

// Form step definitions
export const FORM_STEPS = {
  BUSINESS_INFO: 1,
  SERVICE_DETAILS: 2,
  CONTACT_INFO: 3,
} as const;

export type FormStep = typeof FORM_STEPS[keyof typeof FORM_STEPS];

// Step-specific field mappings
export const STEP_FIELDS: Record<
  FormStep,
  readonly (keyof ProviderOnboardingData)[]
> = {
  [FORM_STEPS.BUSINESS_INFO]: [
    "businessName",
    "businessAddress",
    "logo",
  ],
  [FORM_STEPS.SERVICE_DETAILS]: [
    "description",
    "serviceAreas",
    "sampleMenu",
  ],
  [FORM_STEPS.CONTACT_INFO]: [
    "contactPersonName",
    "mobileNumber",
    "socialMediaLinks",
  ],
} as const;

// Step validation schemas
export const STEP_SCHEMAS = {
  [FORM_STEPS.BUSINESS_INFO]: providerBusinessInfoSchema,
  [FORM_STEPS.SERVICE_DETAILS]: providerServiceDetailsSchema,
  [FORM_STEPS.CONTACT_INFO]: providerContactInfoSchema,
} as const;

export interface UseOnboardingFormOptions {
  defaultValues?: Partial<ProviderOnboardingData>;
  onStepValidationChange?: (step: FormStep, isValid: boolean) => void;
  onDataChange?: (data: Partial<ProviderOnboardingData>) => void;
  enableAutoSave?: boolean;
  autoSaveKey?: string;
}

export interface OnboardingFormReturn extends UseFormReturn<ProviderOnboardingData> {
  // Step validation
  isStepValid: (step: FormStep) => boolean;
  getStepErrors: (step: FormStep) => Record<string, any>;
  validateStep: (step: FormStep) => Promise<boolean>;
  
  // Step data management
  getStepData: (step: FormStep) => Partial<ProviderOnboardingData>;
  setStepData: (step: FormStep, data: Partial<ProviderOnboardingData>) => void;
  
  // Form persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
  hasStoredData: () => boolean;
  getStorageInfo: () => { hasData: boolean; lastSaved?: Date; dataSize?: number };

  // Form reset and recovery
  resetForm: () => void;
  resetStep: (step: FormStep) => void;
  recoverFromError: () => void;
  createBackup: () => void;
  restoreFromBackup: () => boolean;
  
  // Form state
  isDirty: boolean;
  isAnyStepValid: boolean;
  completedSteps: FormStep[];
}

const DEFAULT_VALUES: Partial<ProviderOnboardingData> = {
  businessName: "",
  businessAddress: "",
  logo: undefined,
  description: "",
  serviceAreas: [],
  sampleMenu: undefined,
  contactPersonName: "",
  mobileNumber: "",
  socialMediaLinks: {
    facebook: "",
    instagram: "",
    website: "",
  },
};

export function useOnboardingForm(options: UseOnboardingFormOptions = {}): OnboardingFormReturn {
  const {
    defaultValues = DEFAULT_VALUES,
    onStepValidationChange,
    onDataChange,
    enableAutoSave = true,
    autoSaveKey = "onboarding-form-data",
  } = options;

  // Initialize form with combined schema
  const form = useForm<ProviderOnboardingData>({
    resolver: zodResolver(providerOnboardingSchema),
    defaultValues: defaultValues as ProviderOnboardingData,
    mode: "onChange",
  });

  const { watch, formState, trigger, getValues, setValue, reset } = form;
  const watchedValues = watch();

  // Define functions before they are used in useEffect dependencies
  const saveToStorage = useCallback(() => {
    try {
      const currentData = getValues();
      localStorage.setItem(autoSaveKey, JSON.stringify(currentData));
    } catch (error) {
      console.error("Failed to save form data to storage:", error);
    }
  }, [getValues, autoSaveKey]);

  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(autoSaveKey);
      if (stored) {
        const parsedData = JSON.parse(stored);
        Object.keys(parsedData).forEach((key) => {
          setValue(key as keyof ProviderOnboardingData, parsedData[key], {
            shouldValidate: false,
            shouldDirty: false,
          });
        });
      }
    } catch (error) {
      console.error("Failed to load form data from storage:", error);
    }
  }, [setValue, autoSaveKey]);



  // Load data from storage on mount
  useEffect(() => {
    if (enableAutoSave) {
      loadFromStorage();
    }
  }, [enableAutoSave, loadFromStorage]);

  // Auto-save to storage when data changes (debounced)
  useEffect(() => {
    if (enableAutoSave && formState.isDirty) {
      const timeoutId = setTimeout(() => {
        saveToStorage();
      }, 1000); // Debounce auto-save by 1 second

      return () => clearTimeout(timeoutId);
    }
    // Return undefined for the else case
    return undefined;
  }, [watchedValues, enableAutoSave, formState.isDirty, saveToStorage]);

  // Step validation functions (defined before use)
  const isStepValid = useCallback((step: FormStep): boolean => {
    const stepFields = STEP_FIELDS[step];
    const errors = formState.errors;

    // Check if any step fields have errors
    return !stepFields.some(field => {
      if (field === 'socialMediaLinks') {
        return errors.socialMediaLinks?.facebook ||
               errors.socialMediaLinks?.instagram ||
               errors.socialMediaLinks?.website;
      }
      return errors[field as keyof typeof errors];
    });
  }, [formState.errors]);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(watchedValues);
    }
  }, [watchedValues, onDataChange]);

  // Notify parent of step validation changes
  useEffect(() => {
    if (onStepValidationChange) {
      Object.values(FORM_STEPS).forEach((step) => {
        const isValid = isStepValid(step);
        onStepValidationChange(step, isValid);
      });
    }
  }, [formState.errors, onStepValidationChange, isStepValid]);

  const getStepErrors = useCallback((step: FormStep): Record<string, any> => {
    const stepFields = STEP_FIELDS[step];
    const errors = formState.errors;
    const stepErrors: Record<string, any> = {};
    
    stepFields.forEach(field => {
      if (errors[field as keyof typeof errors]) {
        stepErrors[field] = errors[field as keyof typeof errors];
      }
    });
    
    return stepErrors;
  }, [formState.errors]);

  const validateStep = useCallback(async (step: FormStep): Promise<boolean> => {
    const stepFields = STEP_FIELDS[step];
    const result = await trigger(stepFields as FieldPath<ProviderOnboardingData>[]);
    return result;
  }, [trigger]);

  // Step data management
  const getStepData = useCallback((step: FormStep): Partial<ProviderOnboardingData> => {
    const stepFields = STEP_FIELDS[step];
    const values = getValues();
    const stepData: Partial<ProviderOnboardingData> = {};

    stepFields.forEach(field => {
      stepData[field] = values[field] as any;
    });
    
    return stepData;
  }, [getValues]);

  const setStepData = useCallback((step: FormStep, data: Partial<ProviderOnboardingData>) => {
    const stepFields = STEP_FIELDS[step];
    
    stepFields.forEach(field => {
      if (field in data) {
        setValue(
          field,
          data[field] as ProviderOnboardingData[keyof ProviderOnboardingData],
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    });
  }, [setValue]);

  // Storage utility functions

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(autoSaveKey);
    } catch (error) {
      console.warn("Failed to clear form data from storage:", error);
    }
  }, [autoSaveKey]);

  const hasStoredData = useCallback(() => {
    try {
      const saved = localStorage.getItem(autoSaveKey);
      return !!saved;
    } catch (error) {
      return false;
    }
  }, [autoSaveKey]);

  const getStorageInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (!saved) {
        return { hasData: false };
      }

      const storageData = JSON.parse(saved);
      return {
        hasData: true,
        lastSaved: storageData.timestamp ? new Date(storageData.timestamp) : undefined,
        dataSize: new Blob([saved]).size,
      };
    } catch (error) {
      return { hasData: false };
    }
  }, [autoSaveKey]);

  // Form reset and recovery functions
  const resetForm = useCallback(() => {
    try {
      // Reset to default values
      reset(DEFAULT_VALUES as ProviderOnboardingData);
      // Clear storage
      clearStorage();
    } catch (error) {
      console.warn("Failed to reset form:", error);
    }
  }, [reset, clearStorage]);

  const resetStep = useCallback((step: FormStep) => {
    try {
      const stepFields = STEP_FIELDS[step];
      const defaultStepData: Partial<ProviderOnboardingData> = {};

    stepFields.forEach(field => {
        defaultStepData[field] = DEFAULT_VALUES[field] as any;
      });

      // Reset only the fields for this step
      stepFields.forEach(field => {
        setValue(
          field,
          defaultStepData[field] as any,
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      });
    } catch (error) {
      console.warn(`Failed to reset step ${step}:`, error);
    }
  }, [setValue]);

  const createBackup = useCallback(() => {
    try {
      const currentData = getValues();
      const backupKey = `${autoSaveKey}-backup`;
      const backupData = {
        formData: currentData,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };
      localStorage.setItem(backupKey, JSON.stringify(backupData));
    } catch (error) {
      console.warn("Failed to create backup:", error);
    }
  }, [getValues, autoSaveKey]);

  const restoreFromBackup = useCallback(() => {
    try {
      const backupKey = `${autoSaveKey}-backup`;
      const backup = localStorage.getItem(backupKey);
      if (!backup) {
        return false;
      }

      const backupData = JSON.parse(backup);
      const data = backupData.formData || backupData;

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          setValue(key as keyof ProviderOnboardingData, data[key], {
            shouldValidate: false,
            shouldDirty: true,
          });
        }
      });

      return true;
    } catch (error) {
      console.warn("Failed to restore from backup:", error);
      return false;
    }
  }, [setValue, autoSaveKey]);

  const recoverFromError = useCallback(() => {
    try {
      // First try to restore from backup
      if (restoreFromBackup()) {
        return;
      }

      // If no backup, try to load from storage
      if (hasStoredData()) {
        loadFromStorage();
        return;
      }

      // Last resort: reset to defaults
      resetForm();
    } catch (error) {
      console.warn("Failed to recover from error:", error);
      // Final fallback: reset to defaults
      reset(DEFAULT_VALUES as ProviderOnboardingData);
    }
  }, [restoreFromBackup, hasStoredData, loadFromStorage, resetForm, reset]);

  // Computed properties
  const isAnyStepValid = Object.values(FORM_STEPS).some(step => isStepValid(step));
  const completedSteps = Object.values(FORM_STEPS).filter(step => isStepValid(step));

  return {
    ...form,
    isStepValid,
    getStepErrors,
    validateStep,
    getStepData,
    setStepData,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    hasStoredData,
    getStorageInfo,
    resetForm,
    resetStep,
    recoverFromError,
    createBackup,
    restoreFromBackup,
    isDirty: formState.isDirty,
    isAnyStepValid,
    completedSteps,
  } as OnboardingFormReturn;
}
