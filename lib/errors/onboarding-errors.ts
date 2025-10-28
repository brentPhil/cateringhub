/**
 * Custom error classes for provider onboarding
 * These provide better error handling and user feedback
 */

/**
 * Base class for all onboarding errors
 */
export class OnboardingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

/**
 * User already has a provider profile
 */
export class AlreadyProviderError extends OnboardingError {
  constructor(message: string = 'User already has a provider profile') {
    super(
      message,
      'ALREADY_PROVIDER',
      'You already have a provider profile. Please visit your dashboard.',
      false // Not retryable
    );
    this.name = 'AlreadyProviderError';
  }
}

/**
 * Validation error (invalid input data)
 */
export class ValidationError extends OnboardingError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      message,
      false // Not retryable
    );
    this.name = 'ValidationError';
  }
}

/**
 * Authentication/authorization error
 */
export class UnauthorizedError extends OnboardingError {
  constructor(message: string = 'You are not authorized to perform this action') {
    super(
      message,
      'UNAUTHORIZED',
      'You are not authorized to perform this action. Please sign in and try again.',
      false // Not retryable
    );
    this.name = 'UnauthorizedError';
  }
}

/**
 * Duplicate request (another request is processing)
 */
export class DuplicateRequestError extends OnboardingError {
  constructor(message: string = 'Another onboarding request is currently processing') {
    super(
      message,
      'DUPLICATE_REQUEST',
      'Another onboarding request is currently processing. Please wait a moment and try again.',
      true // Retryable after a delay
    );
    this.name = 'DuplicateRequestError';
  }
}

/**
 * Network error (connection issues, timeouts)
 */
export class NetworkError extends OnboardingError {
  constructor(message: string = 'Network error occurred') {
    super(
      message,
      'NETWORK_ERROR',
      'Network connection issue. Please check your internet connection and try again.',
      true // Retryable
    );
    this.name = 'NetworkError';
  }
}

/**
 * File upload error
 */
export class FileUploadError extends OnboardingError {
  constructor(
    message: string,
    public readonly fileName?: string
  ) {
    super(
      message,
      'FILE_UPLOAD_ERROR',
      `Failed to upload file${fileName ? ` "${fileName}"` : ''}. Please try again.`,
      true // Retryable
    );
    this.name = 'FileUploadError';
  }
}

/**
 * Database error (constraint violations, etc.)
 */
export class DatabaseError extends OnboardingError {
  constructor(
    message: string,
    public readonly sqlState?: string
  ) {
    super(
      message,
      'DATABASE_ERROR',
      'A database error occurred. Please try again or contact support if the issue persists.',
      false // Not retryable (likely a data issue)
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Unknown/unexpected error
 */
export class UnknownOnboardingError extends OnboardingError {
  constructor(message: string = 'An unexpected error occurred') {
    super(
      message,
      'UNKNOWN_ERROR',
      'An unexpected error occurred. Please try again or contact support if the issue persists.',
      true // Retryable (might be transient)
    );
    this.name = 'UnknownOnboardingError';
  }
}

/**
 * Map Postgres error codes (SQLSTATE) to user-friendly messages
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const POSTGRES_ERROR_CODES: Record<string, { message: string; errorClass: typeof OnboardingError }> = {
  '23505': {
    message: 'This record already exists. You may already have a provider profile.',
    errorClass: AlreadyProviderError,
  },
};

/**
 * Extract Postgres error code from error object
 */
function getPostgresErrorCode(error: unknown): string | null {
  // Check various possible locations for error code
  const err = error as Record<string, unknown>;
  if (typeof err.code === 'string') return err.code;
  if (typeof (err.details as Record<string, unknown>)?.code === 'string') {
    return (err.details as Record<string, unknown>).code as string;
  }
  if (typeof (err.error as Record<string, unknown>)?.code === 'string') {
    return (err.error as Record<string, unknown>).code as string;
  }

  // Try to extract from message (format: "Error: [CODE] message")
  const message = err.message;
  if (typeof message === 'string') {
    const codeMatch = message.match(/\[(\d{5})\]/);
    if (codeMatch) return codeMatch[1];
  }

  return null;
}

/**
 * Parse error message and return appropriate error class
 */
export function parseOnboardingError(error: unknown): OnboardingError {
  // Return as-is if already normalized
  if (error instanceof OnboardingError) {
    return error;
  }

  const err = error as Record<string, unknown>;
  const rawMessage: string = (typeof err?.message === 'string' ? err.message : 'Something went wrong');
  const code = getPostgresErrorCode(err);

  // Duplicates (unique_violation)
  if (code === '23505' || /already has a provider|already exists/i.test(rawMessage)) {
    return new AlreadyProviderError();
  }

  // Unauthorized/auth scenarios
  if (/unauthorized|not authorized|authentication/i.test(rawMessage)) {
    return new UnauthorizedError();
  }

  // File upload related
  if (/upload|file/i.test(rawMessage)) {
    return new FileUploadError(rawMessage);
  }

  // Generic fallback
  return new OnboardingError(
    rawMessage,
    'UNKNOWN_ERROR',
    'Something went wrong. Please try again.'
  );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof OnboardingError) {
    return error.retryable;
  }

  // Parse and check
  const parsedError = parseOnboardingError(error);
  return parsedError.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof OnboardingError) {
    return error.userMessage;
  }

  // Parse and get message
  const parsedError = parseOnboardingError(error);
  return parsedError.userMessage;
}

