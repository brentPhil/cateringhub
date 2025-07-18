/**
 * Shared form hooks and utilities for onboarding components
 * Reduces code duplication and provides consistent form behavior
 */

import * as React from "react";
import {
  useForm,
  type UseFormReturn,
  type FieldValues,
  type DefaultValues,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useOnboardingErrorHandler } from "../onboarding-error-boundary";
import type {
  OnboardingFormInstance,
  FormStepValidation,
} from "./form-types";

// Generic form hook for onboarding steps
export function useOnboardingStepForm<
  TData extends FieldValues
>(
  schema: z.ZodType<TData, z.ZodTypeDef, TData>,
  data: Partial<TData>,
  onDataChange: (data: Partial<TData>) => void,
  unifiedForm?: OnboardingFormInstance
) {
  // Create local form with proper typing and memoized defaults
  const localForm = useForm<TData>({
    resolver: zodResolver<TData>(schema),
    defaultValues: React.useMemo(() => {
      // Create default values from schema and provided data
      const defaults = {} as TData;

      // Safely access schema shape for ZodObject types
      if (schema._def && 'shape' in schema._def && typeof schema._def.shape === 'function') {
        const shape = schema._def.shape();
        Object.keys(shape).forEach((key) => {
          const fieldKey = key as keyof TData;
          defaults[fieldKey] = data[fieldKey] ?? getDefaultValueForField(shape[key]);
        });
      } else {
        // Fallback: use provided data as defaults
        Object.keys(data).forEach((key) => {
          const fieldKey = key as keyof TData;
          if (data[fieldKey] !== undefined) {
            defaults[fieldKey] = data[fieldKey] as TData[keyof TData];
          }
        });
      }

      return defaults as DefaultValues<TData>;
    }, [data, schema]),
    mode: "onChange",
  });

  // Determine which form to use with proper typing
  const activeForm = unifiedForm ?? localForm;

  // Memoized callbacks to prevent unnecessary re-renders
  const onDataChangeCb = React.useCallback(
    (newData: Partial<TData>) => {
      onDataChange(newData);
    },
    [onDataChange]
  );

  const onFieldChange = React.useCallback(
    (name: keyof TData, value: TData[keyof TData]) => {
      const currentData = activeForm.getValues();
      const updatedData = { ...currentData, [name]: value };
      onDataChange(updatedData as Partial<TData>);
    },
    [activeForm, onDataChange]
  );

  const onFieldBlur = React.useCallback(
    (name: keyof TData) => {
      // Trigger validation for the specific field
      activeForm.trigger(name as FieldPath<TData>);
    },
    [activeForm]
  );

  const callbacks = React.useMemo(
    () => ({
      onDataChange: onDataChangeCb,
      onFieldChange,
      onFieldBlur,
    }),
    [onDataChangeCb, onFieldChange, onFieldBlur]
  );

  // Optimized effect with proper dependencies and cleanup
  React.useEffect(() => {
    if (unifiedForm) {
      // Unified form handles its own state management
      return;
    }

    // Only set up watchers for local form
    const subscription = localForm.watch((watchedValues, { name, type }) => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (type === "change" && name) {
        const fieldName = name as keyof TData;
        const watchedValue = watchedValues[fieldName as keyof typeof watchedValues];
        if (watchedValue !== data[fieldName]) {
          callbacks.onDataChange(watchedValues as Partial<TData>);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [localForm, callbacks, unifiedForm, data]);



  // Form validation helpers
  const validation = React.useMemo<FormStepValidation>(() => ({
    isValid: activeForm.formState.isValid,
    errors: activeForm.formState.errors as Record<string, string[]>,
    touchedFields: new Set(Object.keys(activeForm.formState.touchedFields)),
  }), [activeForm.formState]);

  return {
    form: activeForm,
    isLocalForm: !unifiedForm,
    callbacks,
    validation,
  };
}

// Hook for managing dynamic arrays (like service areas) with optimized performance
export function useDynamicArray<T = string>(
  form: UseFormReturn<FieldValues>,
  fieldName: string,
  validator?: (value: T) => boolean
) {
  const [inputValue, setInputValue] = React.useState<string>("");
  const { setValue, getValues } = form;

  const addItem = React.useCallback((value: T | string) => {
    const stringValue = typeof value === "string" ? value : String(value);
    const trimmedValue = stringValue.trim();
    
    if (!trimmedValue) return false;
    
    if (validator && !validator(value as T)) return false;
    
    const currentItems = getValues(fieldName) || [];
    
    // Prevent duplicates
    if (currentItems.includes(trimmedValue)) return false;
    
    const updatedItems = [...currentItems, trimmedValue];
    setValue(fieldName, updatedItems, { shouldValidate: true });
    setInputValue("");
    
    return true;
  }, [fieldName, setValue, getValues, validator]);

  const removeItem = React.useCallback((index: number) => {
    const currentItems = (getValues(fieldName) || []) as T[];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setValue(fieldName, updatedItems, { shouldValidate: true });
  }, [fieldName, setValue, getValues]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(inputValue);
    }
  }, [addItem, inputValue]);

  const clearAll = React.useCallback(() => {
    setValue(fieldName, [], { shouldValidate: true });
  }, [fieldName, setValue]);

  return {
    inputValue,
    setInputValue,
    addItem,
    removeItem,
    handleKeyDown,
    clearAll,
    items: form.watch(fieldName) || [],
  };
}

// Hook for file upload handling
export function useFileUpload(
  form: UseFormReturn<FieldValues>,
  fieldName: string,
  config: {
    maxSize?: number;
    allowedTypes?: string[];
    onUploadStart?: () => void;
    onUploadComplete?: (file: File) => void;
    onUploadError?: (error: Error) => void;
  } = {}
) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const { handleOnboardingError } = useOnboardingErrorHandler();

  const validateFile = React.useCallback((file: File): boolean => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = config;

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      handleOnboardingError(new Error(`File size must be less than ${maxSizeMB}MB`));
      return false;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      handleOnboardingError(new Error("Invalid file type"));
      return false;
    }

    return true;
  }, [config, handleOnboardingError]);

  const uploadFile = React.useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      config.onUploadStart?.();

      // Simulate upload progress (replace with actual upload logic)
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Set the file in the form
      form.setValue(fieldName, file, { shouldValidate: true });

      setUploadProgress(100);
      config.onUploadComplete?.(file);
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error("Upload failed");
      handleOnboardingError(uploadError);
      config.onUploadError?.(uploadError);
    } finally {
      // Clean up interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [validateFile, form, fieldName, config, handleOnboardingError]);

  const removeFile = React.useCallback(() => {
    form.setValue(fieldName, undefined, { shouldValidate: true });
    setUploadProgress(0);
  }, [form, fieldName]);

  return {
    uploadFile,
    removeFile,
    isUploading,
    uploadProgress,
    currentFile: form.watch(fieldName),
  };
}

// Helper function to get default values for different field types
function getDefaultValueForField(zodField: unknown): unknown {
  if (!zodField) return undefined;

  // Handle ZodOptional
  if (zodField._def?.typeName === "ZodOptional") {
    return getDefaultValueForField(zodField._def.innerType);
  }

  // Handle different Zod types
  switch (zodField._def?.typeName) {
    case "ZodString":
      return "";
    case "ZodNumber":
      return 0;
    case "ZodBoolean":
      return false;
    case "ZodArray":
      return [];
    case "ZodObject":
      const shape = zodField._def.shape();
      const obj: Record<string, unknown> = {};
      Object.keys(shape).forEach(key => {
        obj[key] = getDefaultValueForField(shape[key]);
      });
      return obj;
    default:
      return undefined;
  }
}

// Hook for form step navigation and validation
export function useFormStepNavigation(
  totalSteps: number,
  currentStep: number,
  onStepChange: (step: number) => void,
  validateStep?: (step: number) => Promise<boolean>
) {
  const [isValidating, setIsValidating] = React.useState(false);

  const goToStep = React.useCallback(async (step: number) => {
    if (step < 1 || step > totalSteps) return false;
    
    if (validateStep) {
      setIsValidating(true);
      try {
        const isValid = await validateStep(currentStep);
        if (!isValid) return false;
      } finally {
        setIsValidating(false);
      }
    }
    
    onStepChange(step);
    return true;
  }, [totalSteps, currentStep, onStepChange, validateStep]);

  const nextStep = React.useCallback(() => {
    return goToStep(currentStep + 1);
  }, [goToStep, currentStep]);

  const prevStep = React.useCallback(() => {
    return goToStep(currentStep - 1);
  }, [goToStep, currentStep]);

  return {
    goToStep,
    nextStep,
    prevStep,
    isValidating,
    canGoNext: currentStep < totalSteps,
    canGoPrev: currentStep > 1,
  };
}
