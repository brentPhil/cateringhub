/**
 * TanStack Query (React Query) related type definitions
 */

import type { UseQueryOptions, UseMutationOptions, UseInfiniteQueryOptions } from '@tanstack/react-query'
import type { SupabaseResponse, SupabaseError, QueryOptions, TableName } from './api.types'

// Query key types
export type QueryKey = readonly unknown[]

// Base query options
export interface BaseQueryOptions<TData = unknown, TError = SupabaseError> {
  enabled?: boolean
  staleTime?: number
  gcTime?: number
  retry?: boolean | number | ((failureCount: number, error: TError) => boolean)
  retryDelay?: number | ((retryAttempt: number, error: TError) => number)
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean | 'always'
  refetchOnReconnect?: boolean | 'always'
  refetchInterval?: number | false | ((data: TData | undefined, query: unknown) => number | false)
  refetchIntervalInBackground?: boolean
}

// Supabase query options
export interface SupabaseQueryOptions<TData = unknown> extends BaseQueryOptions<TData, SupabaseError> {
  table?: TableName
  queryOptions?: QueryOptions
}

// Query result types
export interface QueryResult<TData = unknown, TError = SupabaseError> {
  data: TData | undefined
  error: TError | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  isSuccess: boolean
  isPending: boolean
  isStale: boolean
  refetch: () => void
  remove: () => void
}

export interface InfiniteQueryResult<TData = unknown, TError = SupabaseError> extends Omit<QueryResult<TData, TError>, 'data'> {
  data: {
    pages: TData[]
    pageParams: unknown[]
  } | undefined
  fetchNextPage: () => void
  fetchPreviousPage: () => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  isFetchingNextPage: boolean
  isFetchingPreviousPage: boolean
}

// Mutation types
export interface MutationOptions<TData = unknown, TError = SupabaseError, TVariables = unknown> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown
}

export interface MutationResult<TData = unknown, TError = SupabaseError, TVariables = unknown> {
  data: TData | undefined
  error: TError | null
  isIdle: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  reset: () => void
}

// Specific query types for CateringHub

// User queries
export interface UserQueryOptions extends SupabaseQueryOptions {
  userId?: string
}

export interface ProfileQueryOptions extends SupabaseQueryOptions {
  userId?: string
  includeRole?: boolean
}

// Data fetching hook options
export interface FetchDataOptions<T = unknown> extends QueryOptions {
  queryKey: QueryKey
  enabled?: boolean
  select?: (data: unknown) => T
}

// Pagination query types
export interface PaginatedQueryOptions extends SupabaseQueryOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedQueryResult<T = unknown> extends QueryResult<T> {
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Search query types
export interface SearchQueryOptions extends PaginatedQueryOptions {
  query?: string
  filters?: Record<string, unknown>
  searchColumns?: string[]
}

// Infinite query types
export interface InfiniteQueryOptions<T = unknown> extends BaseQueryOptions<T> {
  pageSize?: number
  getNextPageParam?: (lastPage: T, allPages: T[]) => unknown
  getPreviousPageParam?: (firstPage: T, allPages: T[]) => unknown
  maxPages?: number
}

// Real-time query types
export interface RealtimeQueryOptions<T = unknown> extends SupabaseQueryOptions<T> {
  subscribe?: boolean
  subscriptionKey?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
}

// Cache management types
export interface CacheOptions {
  invalidateQueries?: QueryKey[]
  removeQueries?: QueryKey[]
  setQueryData?: Array<{
    queryKey: QueryKey
    data: unknown
  }>
}

// Optimistic update types
export interface OptimisticUpdateOptions<T = unknown> {
  queryKey: QueryKey
  updater: (oldData: T | undefined) => T
  rollback?: (context: unknown) => void
}

// Query factory types
export interface QueryFactory {
  all: () => QueryKey
  lists: () => QueryKey
  list: (filters?: Record<string, unknown>) => QueryKey
  details: () => QueryKey
  detail: (id: string) => QueryKey
}

// Specific query factories
export interface UserQueryFactory extends QueryFactory {
  profile: (userId: string) => QueryKey
  roles: (userId: string) => QueryKey
  permissions: (userId: string) => QueryKey
}

export interface NotificationQueryFactory extends QueryFactory {
  unread: () => QueryKey
  byType: (type: string) => QueryKey
}

// Query client configuration
export interface QueryClientConfig {
  defaultOptions?: {
    queries?: BaseQueryOptions
    mutations?: MutationOptions
  }
  queryCache?: {
    onError?: (error: unknown, query: unknown) => void
    onSuccess?: (data: unknown, query: unknown) => void
  }
  mutationCache?: {
    onError?: (error: unknown, variables: unknown, context: unknown, mutation: unknown) => void
    onSuccess?: (data: unknown, variables: unknown, context: unknown, mutation: unknown) => void
  }
}

// Background sync types
export interface BackgroundSyncOptions {
  enabled?: boolean
  interval?: number
  retryOnFailure?: boolean
  syncOnReconnect?: boolean
  syncOnFocus?: boolean
}

// Offline support types
export interface OfflineOptions {
  enabled?: boolean
  storage?: 'localStorage' | 'sessionStorage' | 'indexedDB'
  maxAge?: number
  maxSize?: number
  syncOnReconnect?: boolean
}

// Query devtools types
export interface DevtoolsOptions {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  initialIsOpen?: boolean
  panelProps?: Record<string, unknown>
}

// Performance monitoring types
export interface QueryMetrics {
  queryKey: QueryKey
  duration: number
  cacheHit: boolean
  error?: SupabaseError
  timestamp: number
}

export interface QueryPerformanceOptions {
  enabled?: boolean
  threshold?: number
  onSlowQuery?: (metrics: QueryMetrics) => void
  onError?: (metrics: QueryMetrics) => void
}

// Prefetching types
export interface PrefetchOptions<T = unknown> extends BaseQueryOptions<T> {
  queryKey: QueryKey
  queryFn: () => Promise<T>
  staleTime?: number
}

// Query invalidation types
export interface InvalidationOptions {
  exact?: boolean
  refetchType?: 'active' | 'inactive' | 'all'
  cancelRefetch?: boolean
}

// Subscription types
export interface SubscriptionOptions<T = unknown> {
  queryKey: QueryKey
  enabled?: boolean
  onData?: (data: T) => void
  onError?: (error: SupabaseError) => void
  onSubscribed?: () => void
  onUnsubscribed?: () => void
}

// Query state types
export interface QueryState<T = unknown> {
  data: T | undefined
  dataUpdatedAt: number
  error: SupabaseError | null
  errorUpdatedAt: number
  fetchFailureCount: number
  fetchFailureReason: SupabaseError | null
  fetchMeta: unknown
  isInvalidated: boolean
  status: 'pending' | 'error' | 'success'
  fetchStatus: 'fetching' | 'paused' | 'idle'
}

// Mutation state types
export interface MutationState<T = unknown, TError = SupabaseError, TVariables = unknown> {
  data: T | undefined
  error: TError | null
  failureCount: number
  failureReason: TError | null
  isPaused: boolean
  status: 'idle' | 'pending' | 'error' | 'success'
  variables: TVariables | undefined
  submittedAt: number
}

// Query observer types
export interface QueryObserverOptions<T = unknown> extends BaseQueryOptions<T> {
  queryKey: QueryKey
  queryFn: () => Promise<T>
  notifyOnChangeProps?: Array<keyof QueryResult<T>>
}

// Hydration types
export interface HydrationOptions {
  queries?: Array<{
    queryKey: QueryKey
    queryFn: () => Promise<unknown>
    data?: unknown
  }>
  mutations?: Array<{
    mutationKey?: QueryKey
    data?: unknown
    error?: SupabaseError
    variables?: unknown
  }>
}
