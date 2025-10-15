/**
 * API Error Handling Utilities
 * Provides consistent error responses across all API endpoints
 */

import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  status: number;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: {
        message,
        code,
        details,
      },
      status: statusCode,
    },
    { status: statusCode }
  );
}

/**
 * Handle API errors and return appropriate response
 */
export function handleAPIError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.code,
      error.details
    );
  }

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500, 'INTERNAL_ERROR');
  }

  return createErrorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Common API error types
 */
export const APIErrors = {
  // Authentication errors (401)
  UNAUTHORIZED: (message = 'Authentication required') =>
    new APIError(message, 401, 'UNAUTHORIZED'),

  // Authorization errors (403)
  FORBIDDEN: (message = 'You do not have permission to perform this action') =>
    new APIError(message, 403, 'FORBIDDEN'),

  // Not found errors (404)
  NOT_FOUND: (resource: string) =>
    new APIError(`${resource} not found`, 404, 'NOT_FOUND'),

  // Validation errors (400)
  INVALID_INPUT: (message: string, details?: unknown) =>
    new APIError(message, 400, 'INVALID_INPUT', details),

  // Conflict errors (409)
  CONFLICT: (message: string) =>
    new APIError(message, 409, 'CONFLICT'),

  // Gone errors (410)
  GONE: (message: string) =>
    new APIError(message, 410, 'GONE'),

  // Rate limit errors (429)
  RATE_LIMIT: (message = 'Too many requests. Please try again later.') =>
    new APIError(message, 429, 'RATE_LIMIT'),

  // Server errors (500)
  INTERNAL: (message = 'An internal server error occurred') =>
    new APIError(message, 500, 'INTERNAL_ERROR'),
};

