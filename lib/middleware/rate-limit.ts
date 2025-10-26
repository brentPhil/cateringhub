/**
 * Rate Limiting Middleware
 * 
 * Implements sliding window rate limiting to prevent abuse of API endpoints.
 * Uses in-memory storage for simplicity. For production with multiple servers,
 * consider using Redis (Upstash) or a distributed cache.
 * 
 * Usage:
 * ```typescript
 * import { RateLimiter } from '@/lib/middleware/rate-limit';
 * 
 * const limiter = RateLimiter.create({
 *   windowMs: 60 * 60 * 1000, // 1 hour
 *   maxRequests: 10,
 * });
 * 
 * const result = await limiter.check(userId);
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     { 
 *       status: 429,
 *       headers: { 'Retry-After': result.retryAfter.toString() }
 *     }
 *   );
 * }
 * ```
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  
  /**
   * Optional: Custom key prefix for namespacing
   */
  keyPrefix?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  
  /**
   * Number of requests remaining in the current window
   */
  remaining: number;
  
  /**
   * Timestamp when the rate limit will reset (Unix timestamp in seconds)
   */
  resetAt: number;
  
  /**
   * Number of seconds to wait before retrying (only set when allowed=false)
   */
  retryAfter: number;
}

/**
 * Request record for tracking
 */
interface RequestRecord {
  timestamps: number[];
  resetAt: number;
}

/**
 * In-memory rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private store: Map<string, RequestRecord>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyPrefix: config.keyPrefix || 'ratelimit',
    };
    this.store = new Map();
    
    // Start cleanup interval to prevent memory leaks
    this.startCleanup();
  }

  /**
   * Factory method to create a rate limiter
   */
  static create(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(config);
  }

  /**
   * Check if a request is allowed for the given key
   */
  async check(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create record
    let record = this.store.get(fullKey);
    if (!record) {
      record = {
        timestamps: [],
        resetAt: now + this.config.windowMs,
      };
      this.store.set(fullKey, record);
    }

    // Remove timestamps outside the current window (sliding window)
    record.timestamps = record.timestamps.filter(ts => ts > windowStart);

    // Check if limit exceeded
    const requestCount = record.timestamps.length;
    const allowed = requestCount < this.config.maxRequests;

    if (allowed) {
      // Add current timestamp
      record.timestamps.push(now);
      record.resetAt = now + this.config.windowMs;
    }

    // Calculate retry after (seconds until oldest request expires)
    const retryAfter = allowed 
      ? 0 
      : Math.ceil((record.timestamps[0] + this.config.windowMs - now) / 1000);

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - record.timestamps.length),
      resetAt: Math.floor(record.resetAt / 1000), // Convert to Unix timestamp
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    const fullKey = `${this.config.keyPrefix}:${key}`;
    this.store.delete(fullKey);
  }

  /**
   * Start cleanup interval to remove expired records
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, record] of this.store.entries()) {
        // Delete records that have expired (resetAt has passed)
        // This cleans up both empty records and records with expired timestamps
        if (record.resetAt < now) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.store.delete(key));

      if (keysToDelete.length > 0) {
        console.log(`[RATE LIMIT] Cleaned up ${keysToDelete.length} expired records`);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Prevent interval from blocking process exit in serverless environments
    // This allows the Node.js process to terminate gracefully when idle
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current stats for a key (for debugging)
   */
  async getStats(key: string): Promise<{
    requestCount: number;
    resetAt: number;
    remaining: number;
  } | null> {
    const fullKey = `${this.config.keyPrefix}:${key}`;
    const record = this.store.get(fullKey);
    
    if (!record) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const validTimestamps = record.timestamps.filter(ts => ts > windowStart);

    return {
      requestCount: validTimestamps.length,
      resetAt: Math.floor(record.resetAt / 1000),
      remaining: Math.max(0, this.config.maxRequests - validTimestamps.length),
    };
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /**
   * Rate limiter for team invitations
   * Limit: 10 invites per hour per user
   */
  invitations: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'invite',
  }),

  /**
   * Rate limiter for resending invitations
   * Limit: 3 resends per hour per invitation
   */
  resendInvitation: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyPrefix: 'resend',
  }),

  /**
   * Rate limiter for profile updates
   * Limit: 20 updates per hour per user
   */
  profileUpdates: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    keyPrefix: 'profile',
  }),

  /**
   * Rate limiter for member status changes (suspend/activate)
   * Limit: 30 changes per hour per user
   */
  memberStatusChanges: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 30,
    keyPrefix: 'status',
  }),

  /**
   * Rate limiter for admin-created members
   * Limit: 10 admin-created members per hour per user
   */
  adminCreateMember: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'admin-create',
  }),

  /**
   * Rate limiter for resending password setup links
   * Limit: 3 resends per hour per member
   */
  resendPasswordLink: RateLimiter.create({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyPrefix: 'resend-password',
  }),
};

/**
 * Helper function to create rate limit error response
 */
export function createRateLimitError(result: RateLimitResult) {
  return {
    error: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: result.retryAfter,
    resetAt: result.resetAt,
  };
}

