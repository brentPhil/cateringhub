/**
 * CSRF Protection Utilities
 * 
 * Next.js Server Actions have built-in CSRF protection via the Origin header check.
 * This file provides additional utilities for API routes that need explicit CSRF validation.
 * 
 * How Next.js Server Actions protect against CSRF:
 * 1. Server Actions can only be called from the same origin
 * 2. Next.js validates the Origin/Referer headers match the request URL
 * 3. Server Actions use POST requests with special headers
 * 
 * For API routes (app/api/*), we implement additional CSRF checks.
 * 
 * Usage:
 * ```typescript
 * import { validateCSRF } from '@/lib/middleware/csrf';
 * 
 * export async function POST(request: Request) {
 *   const csrfValid = await validateCSRF(request);
 *   if (!csrfValid) {
 *     return NextResponse.json(
 *       { error: 'Invalid CSRF token' },
 *       { status: 403 }
 *     );
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

import { NextRequest } from 'next/server';

/**
 * Validate CSRF protection for API routes
 * 
 * Checks that the request comes from the same origin by validating
 * the Origin or Referer header matches the request URL.
 * 
 * This is the same approach Next.js uses for Server Actions.
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  // Only validate for state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true; // GET, HEAD, OPTIONS don't need CSRF protection
  }

  // Get the origin from the request
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    console.warn('[CSRF] No request origin found');
    return false;
  }

  // Get the expected origin from headers
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check Origin header first (most reliable)
  if (origin) {
    const isValid = origin === requestOrigin;
    if (!isValid) {
      console.warn('[CSRF] Origin mismatch:', { origin, expected: requestOrigin });
    }
    return isValid;
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      const isValid = refererOrigin === requestOrigin;
      if (!isValid) {
        console.warn('[CSRF] Referer mismatch:', { referer: refererOrigin, expected: requestOrigin });
      }
      return isValid;
    } catch {
      console.warn('[CSRF] Invalid referer URL:', referer);
      return false;
    }
  }

  // No Origin or Referer header - reject for security
  console.warn('[CSRF] No Origin or Referer header found');
  return false;
}

/**
 * Get the request origin (protocol + host)
 */
function getRequestOrigin(request: NextRequest): string | null {
  // Try to get from headers first
  const host = request.headers.get('host');
  if (host) {
    // Determine protocol
    const proto = request.headers.get('x-forwarded-proto') || 
                  (request.url.startsWith('https') ? 'https' : 'http');
    return `${proto}://${host}`;
  }

  // Fallback to parsing the URL
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    console.error('[CSRF] Failed to parse request URL:', error);
    return null;
  }
}

/**
 * CSRF error response
 */
export const CSRFError = {
  message: 'Invalid CSRF token. Please refresh the page and try again.',
  code: 'CSRF_VALIDATION_FAILED',
  statusCode: 403,
};

/**
 * Check if a request is from the same origin (for additional validation)
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return false;
  }

  if (origin && origin === requestOrigin) {
    return true;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return refererOrigin === requestOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Middleware to validate CSRF for API routes
 * 
 * Usage in API route:
 * ```typescript
 * import { withCSRFProtection } from '@/lib/middleware/csrf';
 * 
 * async function handler(request: NextRequest) {
 *   // Your handler logic
 * }
 * 
 * export const POST = withCSRFProtection(handler);
 * ```
 */
export function withCSRFProtection(
  handler: (request: NextRequest, context?: unknown) => Promise<Response>
) {
  return async (request: NextRequest, context?: unknown): Promise<Response> => {
    const isValid = await validateCSRF(request);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: CSRFError.message,
          code: CSRFError.code,
        }),
        {
          status: CSRFError.statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return handler(request, context);
  };
}

/**
 * Note about Server Actions:
 * 
 * Next.js Server Actions (functions marked with 'use server') have built-in CSRF protection.
 * You don't need to add additional CSRF validation for Server Actions.
 * 
 * Server Actions are protected because:
 * 1. They can only be invoked from the same origin
 * 2. Next.js validates the Origin header automatically
 * 3. They use a special action ID system that prevents external calls
 * 
 * Only use this CSRF middleware for:
 * - API routes (app/api/*)
 * - Custom endpoints that don't use Server Actions
 * - Third-party integrations that need explicit validation
 */

