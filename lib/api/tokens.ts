/**
 * Secure Token Generation Utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate token expiration date
 * @param hours - Number of hours until expiration (default: 48)
 * @returns ISO date string
 */
export function generateTokenExpiration(hours: number = 48): string {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + hours);
  return expirationDate.toISOString();
}

/**
 * Check if a token has expired
 * @param expiresAt - ISO date string of expiration
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

