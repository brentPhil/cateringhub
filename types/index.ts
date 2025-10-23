/**
 * Central type exports for CateringHub
 * This file serves as the main entry point for all type definitions
 */

// CSS module type declarations
import './css'

// Re-export domain-specific types
export * from './api.types'
export * from './form.types'
export type {
  BaseProps,
  Size as UISize,
  Variant as UIVariant,
  Color,
  Position,
  Alignment,
  ThemeMode as UIThemeMode,
  ColorScheme,
  ViewMode as UIViewMode,
  ButtonProps,
  InputProps,
  SelectProps,
  ModalProps,
  AlertProps,
  ToastProps,
  CardProps,
  TableProps,
  PaginationProps,
  LoadingProps,
  AvatarProps,
  BadgeProps,
  ProgressProps
} from './ui.types'
export type {
  QueryResult,
  InfiniteQueryResult,
  MutationResult,
  BaseQueryOptions,
  SupabaseQueryOptions,
  PaginatedQueryOptions,
  SearchQueryOptions,
  RealtimeQueryOptions
} from './query.types'

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type ID = string
export type Timestamp = string
export type Email = string
export type URL = string

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  data: T
  error: null
  status: number
  statusText: string
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
    details?: unknown
  }
  status: number
  statusText: string
}

// Pagination types
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Common filter types
export interface DateRange {
  start: Date | string
  end: Date | string
}

export interface SearchFilters {
  query?: string
  dateRange?: DateRange
  status?: string[]
  tags?: string[]
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

// Form state types
export interface FormState<T = Record<string, unknown>> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

// Navigation types
export interface NavItem {
  id: string
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavItem[]
}

// Theme and UI types
export type ThemeMode = 'light' | 'dark' | 'system'
export type ViewMode = 'grid' | 'list'
export type Size = 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

// File and media types
export interface FileUpload {
  file: File
  preview?: string
  progress?: number
  error?: string
}

export interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video' | 'document'
  name: string
  size: number
  mimeType: string
  createdAt: Timestamp
}
