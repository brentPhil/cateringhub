/**
 * UI component and interface-related type definitions
 */

import type { LucideIcon } from 'lucide-react'

// Base component props
export interface BaseProps {
  className?: string
  children?: React.ReactNode
  id?: string
  'data-testid'?: string
}

// Common UI variants
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
export type Color = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type Position = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type Alignment = 'start' | 'center' | 'end' | 'stretch'

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'

export interface ThemeConfig {
  mode: ThemeMode
  colorScheme: ColorScheme
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  fontFamily: 'inter' | 'roboto' | 'system'
}

// Layout types
export type LayoutType = 'default' | 'sidebar' | 'centered' | 'fullscreen'
export type ViewMode = 'grid' | 'list' | 'table' | 'card'

export interface LayoutProps extends BaseProps {
  type?: LayoutType
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

// Navigation types
export interface NavItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  badge?: string | number
  disabled?: boolean
  external?: boolean
  children?: NavItem[]
}

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
  badge?: string | number
  icon?: LucideIcon
}

// Button types
export interface ButtonProps extends BaseProps {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

// Input types
export interface InputProps extends BaseProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  error?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
}

// Select types
export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

export interface SelectProps extends BaseProps {
  options: SelectOption[]
  value?: string | number | string[] | number[]
  defaultValue?: string | number | string[] | number[]
  placeholder?: string
  disabled?: boolean
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  error?: string
  onChange?: (value: string | number | string[] | number[]) => void
}

// Modal types
export interface ModalProps extends BaseProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: Size
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

// Dialog types
export interface DialogProps extends ModalProps {
  trigger?: React.ReactNode
  footer?: React.ReactNode
}

// Alert types
export interface AlertProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info'
  title?: string
  description?: string
  icon?: LucideIcon
  dismissible?: boolean
  onDismiss?: () => void
}

// Toast types
export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastState {
  toasts: ToastProps[]
}

// Card types
export interface CardProps extends BaseProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  padding?: Size
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  border?: boolean
  hover?: boolean
}

// Table types
export interface TableColumn<T = unknown> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
}

export interface TableProps<T = unknown> extends BaseProps {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  sortable?: boolean
  filterable?: boolean
  selectable?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  onRowClick?: (row: T) => void
  onSelectionChange?: (selectedRows: T[]) => void
}

// Pagination types
export interface PaginationProps extends BaseProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  showPageSizeSelector?: boolean
  showInfo?: boolean
  disabled?: boolean
}

// Loading types
export interface LoadingProps extends BaseProps {
  size?: Size
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
  text?: string
  overlay?: boolean
}

export interface SkeletonProps extends BaseProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
}

// Avatar types
export interface AvatarProps extends BaseProps {
  src?: string
  alt?: string
  fallback?: string
  size?: Size
  variant?: 'circular' | 'square'
  status?: 'online' | 'offline' | 'away' | 'busy'
}

// Badge types
export interface BadgeProps extends BaseProps {
  variant?: Variant
  size?: Size
  dot?: boolean
  count?: number
  max?: number
  showZero?: boolean
}

// Progress types
export interface ProgressProps extends BaseProps {
  value: number
  max?: number
  size?: Size
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  animated?: boolean
}

// Accordion types
export interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
  disabled?: boolean
  defaultOpen?: boolean
}

export interface AccordionProps extends BaseProps {
  items: AccordionItem[]
  type?: 'single' | 'multiple'
  collapsible?: boolean
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
}

// Dropdown types
export interface DropdownItem {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
  onClick?: () => void
}

export interface DropdownProps extends BaseProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}

// Sidebar types
export interface SidebarProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'left' | 'right'
  variant?: 'default' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}

// Command palette types
export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  keywords?: string[]
  shortcut?: string[]
  onSelect: () => void
}

export interface CommandGroup {
  id: string
  label: string
  items: CommandItem[]
}

export interface CommandPaletteProps extends BaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandGroup[]
  placeholder?: string
  emptyMessage?: string
}

// Data display types
export interface StatCardProps extends BaseProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period?: string
  }
  icon?: LucideIcon
  color?: Color
}

export interface MetricProps extends BaseProps {
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  format?: 'number' | 'currency' | 'percentage'
}

// Form UI types
export interface FormFieldProps extends BaseProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

export interface FormSectionProps extends BaseProps {
  title?: string
  description?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// Responsive types
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

// Animation types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce'
export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'in' | 'out'

export interface AnimationProps {
  type?: AnimationType
  direction?: AnimationDirection
  duration?: number
  delay?: number
  easing?: string
}
