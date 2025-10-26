/**
 * Comprehensive form validation schemas using Zod
 */

import { z } from 'zod'
import { isValidPhoneNumber } from 'libphonenumber-js'

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

// Provider profile schema
export const providerProfileFormSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  contactPersonName: z.string().min(2, 'Contact person name must be at least 2 characters'),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .refine(isValidPhoneNumber, { message: 'Please enter a valid phone number' }),
  email: emailSchema.optional().or(z.literal('')),
  // Address fields moved to service_locations; no longer validated here
  tagline: z
    .string()
    .max(100, 'Tagline must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  // Availability fields (optional)
  profileVisible: z.boolean().optional(),
  maxServiceRadius: z.number().min(1).max(1000).optional(), // Max allowed radius per provider
  dailyCapacity: z.number().min(1).max(10).optional(),
  advanceBookingDays: z.number().min(1).max(30).optional(),
  selectedDays: z.array(z.string()).optional(),
  // Social media links (optional)
  socialMediaLinks: z
    .array(
      z.object({
        id: z.string(),
        platform: z.enum(['facebook', 'instagram', 'website', 'tiktok']),
        url: z
          .string()
          .refine(val => !val || val.startsWith('https://'), {
            message: 'URL must start with https://',
          }),
      })
    )
    .optional(),
})

// Helper to create file field schema that handles edge cases
// This schema accepts File | string | undefined | null
// and rejects invalid types like empty arrays or plain objects
const createFileFieldSchema = () => {
  return z
    .union([
      z.instanceof(File),
      z.string(),
      z.undefined(),
      z.null(),
    ])
    .optional()
    .nullable();
};

// Provider onboarding schemas - Multi-step
export const providerBusinessInfoSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessAddress: z.string().optional().or(z.literal('')),
  logo: createFileFieldSchema(),
})

export const providerServiceDetailsSchema = z.object({
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  serviceAreas: z
    .array(z.string().min(1, 'Service area cannot be empty'))
    .min(1, 'At least one service area is required'),
  sampleMenu: createFileFieldSchema(),
})

export const providerContactInfoSchema = z.object({
  contactPersonName: z.string().min(2, 'Contact person name must be at least 2 characters'),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .refine(isValidPhoneNumber, { message: 'Please enter a valid phone number' }),
  socialMediaLinks: z.object({
    facebook: z.string().optional().or(z.literal('')).refine(val => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Please enter a valid Facebook URL or leave empty'
    }),
    instagram: z.string().optional().or(z.literal('')).refine(val => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Please enter a valid Instagram URL or leave empty'
    }),
    website: z.string().optional().or(z.literal('')).refine(val => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Please enter a valid Website URL or leave empty'
    }),
  }).optional(),
})

// Combined schema for final submission
export const providerOnboardingSchema = providerBusinessInfoSchema
  .merge(providerServiceDetailsSchema)
  .merge(providerContactInfoSchema)

// Enhanced schema for the streamlined onboarding flow with comprehensive validation
export const simpleProviderOnboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s&'-]+$/, 'Business name contains invalid characters')
    .refine(val => val.trim().length > 0, 'Business name cannot be empty'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .refine(val => val.trim().length >= 10, 'Description must contain meaningful content'),
  serviceAreas: z
    .string()
    .min(1, 'Service areas are required')
    .refine(val => {
      const areas = val.split(',').map(area => area.trim()).filter(area => area.length > 0);
      return areas.length > 0;
    }, 'Please provide at least one service area')
    .refine(val => {
      const areas = val.split(',').map(area => area.trim()).filter(area => area.length > 0);
      return areas.every(area => area.length >= 2);
    }, 'Each service area must be at least 2 characters'),
  contactPersonName: z
    .string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(50, 'Contact person name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Contact person name can only contain letters, spaces, hyphens, and apostrophes')
    .refine(val => val.trim().length > 0, 'Contact person name cannot be empty'),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .refine(isValidPhoneNumber, { message: 'Please enter a valid phone number' }),
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
    .any()
    .refine(
      (file) => typeof File !== 'undefined' && file instanceof File,
      'Must be a valid file'
    )
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
