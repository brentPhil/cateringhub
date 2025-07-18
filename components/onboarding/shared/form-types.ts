/**
 * Shared form types and utilities for onboarding components
 * Eliminates the need for 'as any' casting and improves type safety
 */

import type { UseFormReturn, FieldPath, FieldValues, Control } from "react-hook-form";
import type { z } from "zod";
import type { ProviderOnboardingFormData } from "@/types/form.types";
import type { OnboardingFormReturn } from "@/hooks/use-onboarding-form";

// Generic form field props with proper typing
export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  disabled?: boolean;
}

// Properly typed form control for onboarding forms
export type OnboardingFormControl = Control<ProviderOnboardingFormData>;

// Union type for form instances used in onboarding
export type OnboardingFormInstance = OnboardingFormReturn | UseFormReturn<ProviderOnboardingFormData>;

// Enhanced typed form control with better generic support
export type TypedFormControl<T extends FieldValues = ProviderOnboardingFormData> = Control<T>;

// Form field path type helper
export type FormFieldPath<T extends FieldValues> = FieldPath<T>;

// Utility type for extracting form data from step components
export type ExtractFormData<T> = T extends BaseOnboardingStepProps<infer U> ? U : never;

// Base props for all onboarding step components
export interface BaseOnboardingStepProps<TData extends Record<string, any>> {
  data: Partial<TData>;
  onDataChange: (data: Partial<TData>) => void;
  form?: OnboardingFormInstance;
  disabled?: boolean;
  className?: string;
}

// Form field configuration for consistent styling and behavior
export interface FormFieldConfig {
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  autoComplete?: string;
  ariaDescribedBy?: string;
}

// Common form validation messages
export const FORM_VALIDATION_MESSAGES = {
  REQUIRED: "This field is required",
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be less than ${max} characters`,
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_URL: "Please enter a valid URL",
  INVALID_PHONE: "Please enter a valid phone number",
  FILE_TOO_LARGE: (maxSize: string) => `File size must be less than ${maxSize}`,
  INVALID_FILE_TYPE: "Invalid file type",
} as const;

// Form field accessibility helpers
export const createFieldId = (name: string, suffix?: string): string => {
  return suffix ? `${name}-${suffix}` : name;
};

export const createAriaDescribedBy = (name: string, hasDescription: boolean, hasError: boolean): string | undefined => {
  const parts: string[] = [];
  if (hasDescription) parts.push(`${name}-description`);
  if (hasError) parts.push(`${name}-error`);
  return parts.length > 0 ? parts.join(" ") : undefined;
};

// Type-safe form field renderer props
export interface TypedFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  render: (field: any) => React.ReactNode;
  disabled?: boolean;
}

// Schema inference helpers
export type InferSchemaType<T> = T extends z.ZodType<infer U> ? U : never;

// Form step validation state
export interface FormStepValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  touchedFields: Set<string>;
}

// Performance optimization types
export interface MemoizedFormCallbacks<TData> {
  onDataChange: (data: Partial<TData>) => void;
  onFieldChange: (name: keyof TData, value: any) => void;
  onFieldBlur: (name: keyof TData) => void;
}

// Error boundary integration
export interface OnboardingErrorInfo {
  componentStack: string;
  errorBoundary: string;
  step: string;
}

// File upload specific types
export interface FileUploadConfig {
  accept: string;
  maxSize: number;
  maxSizeMB: number;
  allowedTypes: string[];
  showPreview: boolean;
}

export const DEFAULT_FILE_CONFIGS: Record<string, FileUploadConfig> = {
  IMAGE: {
    accept: "image/*",
    maxSize: 5 * 1024 * 1024, // 5MB
    maxSizeMB: 5,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    showPreview: true,
  },
  DOCUMENT: {
    accept: "image/*,.pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
    maxSizeMB: 10,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    showPreview: true,
  },
};

// Form field component variants
export type FormFieldVariant = "default" | "compact" | "inline";

// Accessibility constants
export const ARIA_LABELS = {
  REQUIRED_FIELD: "required",
  OPTIONAL_FIELD: "optional",
  ADD_ITEM: "Add item",
  REMOVE_ITEM: "Remove item",
  FILE_UPLOAD: "Upload file",
  FORM_SECTION: "Form section",
} as const;

// Form state management helpers
export interface FormStateHelpers<TData> {
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  errors: Record<keyof TData, string[]>;
  touchedFields: Set<keyof TData>;
  resetField: (name: keyof TData) => void;
  resetForm: () => void;
  validateField: (name: keyof TData) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
}
