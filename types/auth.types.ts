/**
 * Authentication and user-related type definitions
 */

import type { User } from '@supabase/supabase-js'
import { AppRole, Profile, ProviderRoleType, UserRole } from './supabase'

// Extended user type with profile and role information
export interface AuthUser extends User {
  profile?: Profile | null
  userRole?: UserRole | null
}

// User role data structure
export interface UserRoleData {
  role: AppRole
  provider_role?: ProviderRoleType | null
}

// Authentication state
export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  userRole: UserRoleData | null
  isLoading: boolean
  isAuthenticated: boolean
  isProvider: boolean
  isAdmin: boolean
}

// Sign up form data
export interface SignUpData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  acceptTerms: boolean
}

// Sign in form data
export interface SignInData {
  email: string
  password: string
  rememberMe?: boolean
}

// Password reset data
export interface PasswordResetData {
  email: string
}

// Password update data
export interface PasswordUpdateData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Profile update data
export interface ProfileUpdateData {
  full_name?: string
  username?: string
  bio?: string
  avatar_url?: string
}

// OAuth provider types
export type OAuthProvider = 'google' | 'facebook' | 'github' | 'twitter'

// OAuth sign in data
export interface OAuthSignInData {
  provider: OAuthProvider
  redirectTo?: string
}

// Session data
export interface SessionData {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
  user: AuthUser
}



export interface RoleCheck {
  role: AppRole
  hasRole: boolean
}

// Re-export provider onboarding data from form types
export type { ProviderOnboardingFormData as ProviderOnboardingData } from '@/types/form.types'

// User invitation data
export interface UserInvitationData {
  email: string
  role: AppRole
  provider_role?: ProviderRoleType
  message?: string
}

// Account verification data
export interface AccountVerificationData {
  token: string
  type: 'email_confirmation' | 'password_reset' | 'email_change'
}

// Two-factor authentication types
export interface TwoFactorSetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface TwoFactorVerificationData {
  code: string
  type: 'totp' | 'backup_code'
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
}

// Account deletion data
export interface AccountDeletionData {
  password: string
  reason?: string
  feedback?: string
}

// Authentication error types
export interface AuthError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Authentication hooks return types
export interface UseUserReturn {
  data: AuthUser | null
  isLoading: boolean
  error: AuthError | null
  refetch: () => void
}

export interface UseProfileReturn {
  data: Profile | null
  isLoading: boolean
  error: AuthError | null
  refetch: () => void
}

export interface UseUserRoleReturn {
  data: UserRoleData | null
  isLoading: boolean
  error: AuthError | null
  refetch: () => void
}

// Authentication mutation types
export interface SignUpMutationVariables {
  email: string
  password: string
  options?: {
    data?: Record<string, unknown>
    redirectTo?: string
  }
}

export interface SignInMutationVariables {
  email: string
  password: string
}

export interface SignOutMutationVariables {
  scope?: 'global' | 'local'
}

export interface UpdateProfileMutationVariables {
  id: string
  updates: ProfileUpdateData
}

// Role utilities
export type RoleMap = Record<AppRole, boolean>

// Provider-specific types
export interface ProviderProfile extends Profile {
  business_name?: string
  business_type?: string
  description?: string
  location?: string
  phone?: string
  website?: string
  specialties?: string[]
  service_areas?: string[]
  verified?: boolean
  rating?: number
  total_bookings?: number
}

// Staff management types
export interface StaffMember {
  id: string
  user_id: string
  provider_id: string
  role: ProviderRoleType
  invited_at: string
  joined_at?: string
  status: 'pending' | 'active' | 'inactive'
  profile: Profile
}

export interface StaffInvitation {
  email: string
  role: ProviderRoleType
  message?: string
}
