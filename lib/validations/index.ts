/**
 * Comprehensive form validation schemas using Zod
 */

import { z } from 'zod'

// Common validation patterns
const emailSchema = z.string().email('Please enter a valid email address')
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
  .optional()

const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''))

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Profile schemas
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  bio: z
    .string()
    .max(160, 'Bio must be less than 160 characters')
    .optional(),
  avatar_url: urlSchema,
})

// Provider onboarding schema
export const providerOnboardingSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  location: z.string().min(1, 'Location is required'),
  phone: phoneSchema.refine(val => val !== undefined && val !== '', {
    message: 'Phone number is required',
  }),
  website: urlSchema,
  specialties: z
    .array(z.string())
    .min(1, 'Please select at least one specialty')
    .max(10, 'Maximum 10 specialties allowed'),
  serviceAreas: z
    .array(z.string())
    .min(1, 'Please select at least one service area')
    .max(20, 'Maximum 20 service areas allowed'),
  providerRole: z.enum(['owner', 'staff'], {
    required_error: 'Please select a role',
  }),
})

// Contact form schema
export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  phone: phoneSchema,
  company: z.string().optional(),
})

// Search form schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  location: z.string().optional(),
  priceRange: z
    .object({
      min: z.number().min(0, 'Minimum price must be at least 0'),
      max: z.number().min(0, 'Maximum price must be at least 0'),
    })
    .refine(data => data.max >= data.min, {
      message: 'Maximum price must be greater than or equal to minimum price',
      path: ['max'],
    })
    .optional(),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .refine(data => data.end >= data.start, {
      message: 'End date must be after start date',
      path: ['end'],
    })
    .optional(),
  filters: z.record(z.unknown()).optional(),
})

// Settings schemas
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  bookingReminders: z.boolean(),
  reviewNotifications: z.boolean(),
})

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'contacts']),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  allowMessages: z.boolean(),
  allowReviews: z.boolean(),
})

export const accountSettingsSchema = z.object({
  language: z.string().min(1, 'Please select a language'),
  timezone: z.string().min(1, 'Please select a timezone'),
  currency: z.string().min(1, 'Please select a currency'),
  dateFormat: z.string().min(1, 'Please select a date format'),
  theme: z.enum(['light', 'dark', 'system']),
})

// File upload schema
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'File must be an image (JPEG, PNG, WebP, or GIF)'
    ),
  alt: z.string().optional(),
})

// Invitation schema
export const invitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['user', 'admin', 'catering_provider']),
  provider_role: z.enum(['owner', 'staff']).optional(),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
})

// Two-factor authentication schema
export const twoFactorSetupSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
})

export const twoFactorVerificationSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters'),
  type: z.enum(['totp', 'backup_code']),
})

// Account deletion schema
export const accountDeletionSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().optional(),
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').optional(),
})

// Dynamic form field schema
export const dynamicFormFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'password', 'number', 'select', 'checkbox', 'radio', 'textarea', 'file', 'date']),
  name: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  validation: z
    .object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  conditional: z
    .object({
      field: z.string(),
      value: z.unknown(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    })
    .optional(),
})

// Export type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
export type ProviderOnboardingFormData = z.infer<typeof providerOnboardingSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type SearchFormData = z.infer<typeof searchSchema>
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>
export type PrivacySettingsFormData = z.infer<typeof privacySettingsSchema>
export type AccountSettingsFormData = z.infer<typeof accountSettingsSchema>
export type FileUploadFormData = z.infer<typeof fileUploadSchema>
export type InvitationFormData = z.infer<typeof invitationSchema>
export type TwoFactorSetupFormData = z.infer<typeof twoFactorSetupSchema>
export type TwoFactorVerificationFormData = z.infer<typeof twoFactorVerificationSchema>
export type AccountDeletionFormData = z.infer<typeof accountDeletionSchema>
export type DynamicFormFieldData = z.infer<typeof dynamicFormFieldSchema>
