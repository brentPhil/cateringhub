import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Decode a JWT payload using base64url decoding
export function decodeJwtPayload(token: string): Record<string, any> {
  const payload = token.split('.')[1]
  if (!payload) return {}

  // Convert from base64url to base64
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }

  try {
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}
