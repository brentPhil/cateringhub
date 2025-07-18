/**
 * API-related type definitions for CateringHub
 */

import type { Database } from './supabase'

// Generic API response types
export interface SupabaseResponse<T> {
  data: T | null
  error: SupabaseError | null
  count?: number | null
  status: number
  statusText: string
}

export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// Query options for Supabase operations
export interface QueryOptions {
  columns?: string
  filter?: Record<string, unknown>
  order?: {
    column: string
    ascending?: boolean
  }
  limit?: number
  single?: boolean
  range?: [number, number]
  enabled?: boolean
}

// Pagination query options
export interface PaginationOptions extends QueryOptions {
  page?: number
  pageSize?: number
}

// Search and filter options
export interface SearchOptions extends PaginationOptions {
  query?: string
  searchColumns?: string[]
  filters?: Record<string, unknown>
}

// Supabase table names (type-safe)
export type TableName = keyof Database['public']['Tables']

// Generic CRUD operation types
export interface CreateOperation<T> {
  table: TableName
  data: T
}

export interface ReadOperation {
  table: TableName
  options?: QueryOptions
}

export interface UpdateOperation<T> {
  table: TableName
  id: string
  data: Partial<T>
}

export interface DeleteOperation {
  table: TableName
  id: string
}

// Batch operation types
export interface BatchCreateOperation<T> {
  table: TableName
  data: T[]
}

export interface BatchUpdateOperation<T> {
  table: TableName
  updates: Array<{
    id: string
    data: Partial<T>
  }>
}

export interface BatchDeleteOperation {
  table: TableName
  ids: string[]
}

// Real-time subscription types
export interface RealtimeSubscription {
  table: TableName
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  callback: (payload: RealtimePayload) => void
}

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
  errors: string[] | null
}

// File upload types
export interface FileUploadOptions {
  bucket: string
  path: string
  file: File
  options?: {
    cacheControl?: string
    contentType?: string
    upsert?: boolean
  }
}

export interface FileUploadResponse {
  data: {
    path: string
    id: string
    fullPath: string
  } | null
  error: SupabaseError | null
}

// Storage operations
export interface StorageListOptions {
  limit?: number
  offset?: number
  sortBy?: {
    column: 'name' | 'updated_at' | 'created_at'
    order: 'asc' | 'desc'
  }
  search?: string
}

export interface StorageFileObject {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, unknown>
}

// Edge function types
export interface EdgeFunctionInvocation<T = unknown> {
  functionName: string
  body?: T
  headers?: Record<string, string>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
}

export interface EdgeFunctionResponse<T = unknown> {
  data: T | null
  error: SupabaseError | null
}

// Database function types
export interface DatabaseFunction<T = unknown> {
  name: string
  args: T
}

export interface DatabaseFunctionResponse<T = unknown> {
  data: T | null
  error: SupabaseError | null
}

// RPC (Remote Procedure Call) types
export type RPCFunction = keyof Database['public']['Functions']

export interface RPCCall<T extends RPCFunction> {
  function: T
  args: Database['public']['Functions'][T]['Args']
}

export interface RPCResponse<T extends RPCFunction> {
  data: Database['public']['Functions'][T]['Returns'] | null
  error: SupabaseError | null
}

// Webhook types
export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  schema: string
  old_record?: Record<string, unknown>
}

export interface WebhookResponse {
  success: boolean
  message?: string
  error?: string
}

// API rate limiting types
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

export interface RateLimitedResponse<T> extends SupabaseResponse<T> {
  rateLimit: RateLimitInfo
}

// Cache types
export interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[]
  revalidate?: boolean
}

export interface CachedResponse<T> extends SupabaseResponse<T> {
  cached: boolean
  cacheKey: string
  expiresAt?: number
}

// Metrics and analytics types
export interface APIMetrics {
  requestCount: number
  errorCount: number
  averageResponseTime: number
  slowestEndpoint: string
  fastestEndpoint: string
  timestamp: string
}

export interface EndpointMetrics {
  endpoint: string
  method: string
  requestCount: number
  errorCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceHealth
    storage: ServiceHealth
    auth: ServiceHealth
    realtime: ServiceHealth
  }
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastChecked: string
  error?: string
}

// API versioning types
export interface APIVersion {
  version: string
  deprecated: boolean
  sunsetDate?: string
  migrationGuide?: string
}

// Request context types
export interface RequestContext {
  userId?: string
  userRole?: string
  sessionId: string
  ipAddress: string
  userAgent: string
  timestamp: string
  requestId: string
}

// Error tracking types
export interface APIError extends Error {
  code: string
  statusCode: number
  context?: RequestContext
  metadata?: Record<string, unknown>
}

export interface ErrorLog {
  id: string
  error: APIError
  timestamp: string
  resolved: boolean
  resolution?: string
}
