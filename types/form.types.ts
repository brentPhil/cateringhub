/**
 * Form and validation-related type definitions
 */

import type { z } from 'zod'
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'

// Generic form state
export interface FormState<T extends FieldValues = FieldValues> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
  touchedFields: Record<string, boolean>
}

// Form field types
export interface FormField<T extends FieldValues = FieldValues> {
  name: FieldPath<T>
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
}

export interface SelectField<T extends FieldValues = FieldValues> extends FormField<T> {
  options: Array<{
    value: string | number
    label: string
    disabled?: boolean
  }>
  multiple?: boolean
  searchable?: boolean
}

export interface FileField<T extends FieldValues = FieldValues> extends FormField<T> {
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
}

export interface DateField<T extends FieldValues = FieldValues> extends FormField<T> {
  minDate?: Date
  maxDate?: Date
  format?: string
  showTime?: boolean
}

// Validation types
export interface ValidationRule {
  required?: boolean | string
  min?: number | string
  max?: number | string
  minLength?: number | string
  maxLength?: number | string
  pattern?: RegExp | string
  validate?: (value: unknown) => boolean | string
}

export interface FieldValidation extends ValidationRule {
  field: string
  message?: string
}

// Form configuration
export interface FormConfig<T extends FieldValues = FieldValues> {
  fields: FormField<T>[]
  validation?: Record<string, ValidationRule>
  defaultValues?: Partial<T>
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'
}

// Form submission types
export interface FormSubmission<T extends FieldValues = FieldValues> {
  data: T
  formData?: FormData
  files?: File[]
}

export interface FormSubmissionResult {
  success: boolean
  data?: unknown
  error?: string
  errors?: Record<string, string>
}

// Specific form schemas and types

// Profile form
export interface ProfileFormData {
  full_name: string
  username?: string
  bio?: string
  avatar_url?: string
}

// Authentication forms
export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  acceptTerms: boolean
}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
  token: string
}

export interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Provider onboarding form - consolidated type
export interface ProviderOnboardingFormData {
  // Business Information (Step 1)
  businessName: string
  businessAddress?: string
  logo?: File | string

  // Service Details (Step 2)
  description: string
  serviceAreas: string[]
  sampleMenu?: File | string

  // Contact Information (Step 3)
  contactPersonName: string
  mobileNumber: string
  socialMediaLinks?: {
    facebook?: string
    instagram?: string
    website?: string
  }
}

// Contact form
export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
  phone?: string
  company?: string
}

// Search form
export interface SearchFormData {
  query: string
  category?: string
  location?: string
  priceRange?: {
    min: number
    max: number
  }
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, unknown>
}

// Settings forms
export interface NotificationSettingsFormData {
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  bookingReminders: boolean
  reviewNotifications: boolean
}

export interface PrivacySettingsFormData {
  profileVisibility: 'public' | 'private' | 'contacts'
  showEmail: boolean
  showPhone: boolean
  allowMessages: boolean
  allowReviews: boolean
}

export interface AccountSettingsFormData {
  language: string
  timezone: string
  currency: string
  dateFormat: string
  theme: 'light' | 'dark' | 'system'
}

// Form validation schemas (Zod)
export type ProfileFormSchema = z.ZodType<ProfileFormData>
export type LoginFormSchema = z.ZodType<LoginFormData>
export type RegisterFormSchema = z.ZodType<RegisterFormData>
export type ForgotPasswordFormSchema = z.ZodType<ForgotPasswordFormData>
export type ResetPasswordFormSchema = z.ZodType<ResetPasswordFormData>
export type ChangePasswordFormSchema = z.ZodType<ChangePasswordFormData>
export type ProviderOnboardingFormSchema = z.ZodType<ProviderOnboardingFormData>
export type ContactFormSchema = z.ZodType<ContactFormData>
export type SearchFormSchema = z.ZodType<SearchFormData>
export type NotificationSettingsFormSchema = z.ZodType<NotificationSettingsFormData>
export type PrivacySettingsFormSchema = z.ZodType<PrivacySettingsFormData>
export type AccountSettingsFormSchema = z.ZodType<AccountSettingsFormData>

// Form hook return types
export type UseFormReturnType<T extends FieldValues> = UseFormReturn<T>

export interface FormHookOptions<T extends FieldValues = FieldValues> {
  defaultValues?: Partial<T>
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'
  resolver?: (values: T) => Promise<{ values: T; errors: Record<string, string> }>
}

// Form component props
export interface FormProps<T extends FieldValues = FieldValues> {
  onSubmit: (data: T) => void | Promise<void>
  defaultValues?: Partial<T>
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export interface FormFieldProps<T extends FieldValues = FieldValues> {
  name: FieldPath<T>
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

// Form error types
export interface FormError {
  field: string
  message: string
  type: 'required' | 'pattern' | 'min' | 'max' | 'custom'
}

export interface FormErrors {
  [field: string]: FormError
}

// Form step types (for multi-step forms)
export interface FormStep<T extends FieldValues = FieldValues> {
  id: string
  title: string
  description?: string
  fields: FieldPath<T>[]
  validation?: Record<string, ValidationRule>
  optional?: boolean
}

export interface MultiStepFormState<T extends FieldValues = FieldValues> {
  currentStep: number
  steps: FormStep<T>[]
  data: Partial<T>
  completedSteps: number[]
  isValid: boolean
  canProceed: boolean
  canGoBack: boolean
}

// Form wizard types
export interface FormWizardProps<T extends FieldValues = FieldValues> {
  steps: FormStep<T>[]
  onComplete: (data: T) => void | Promise<void>
  onStepChange?: (step: number) => void
  defaultValues?: Partial<T>
  className?: string
}

// Dynamic form types
export interface DynamicFormField {
  id: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file' | 'date'
  name: string
  label: string
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
  validation?: ValidationRule
  conditional?: {
    field: string
    value: unknown
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  }
}

export interface DynamicFormConfig {
  id: string
  title: string
  description?: string
  fields: DynamicFormField[]
  submitText?: string
  resetText?: string
}
