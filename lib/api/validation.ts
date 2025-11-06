/**
 * API Input Validation Utilities
 */

import { APIErrors } from './errors';
import { ProviderRoleSchema, mapLegacyProviderRole, type ProviderRole } from '@/lib/roles';

/**
 * Validate email format
 */
export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    throw APIErrors.INVALID_INPUT('Invalid email address');
  }
  
  return trimmed;
}

/**
 * Validate provider role
 */
export function validateProviderRole(role: string): ProviderRole {
  const mapped = mapLegacyProviderRole(role);
  if (!mapped) {
    throw APIErrors.INVALID_INPUT(
      `Invalid role. Must be one of: ${ProviderRoleSchema.options.join(', ')}`,
      { providedRole: role, validRoles: ProviderRoleSchema.options }
    );
  }
  return mapped;
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = 'ID'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    throw APIErrors.INVALID_INPUT(`Invalid ${fieldName} format`);
  }
  
  return id;
}

/**
 * Validate required string field
 */
export function validateRequired(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw APIErrors.INVALID_INPUT(`${fieldName} is required`);
  }
  
  return value.trim();
}

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = Record<string, unknown>>(
  request: Request
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw APIErrors.INVALID_INPUT('Invalid JSON in request body');
  }
}

/**
 * Validate invitation request body
 */
export interface InvitationRequestBody {
  email: string;
  role: ProviderRole;
}

export function validateInvitationRequest(body: unknown): InvitationRequestBody {
  if (!body || typeof body !== 'object') {
    throw APIErrors.INVALID_INPUT('Request body is required');
  }

  const { email, role } = body as Record<string, unknown>;

  return {
    email: validateEmail(validateRequired(email, 'Email')),
    role: validateProviderRole(validateRequired(role, 'Role')),
  };
}

/**
 * Validate accept invitation request body
 */
export interface AcceptInvitationRequestBody {
  token: string;
}

export function validateAcceptInvitationRequest(body: unknown): AcceptInvitationRequestBody {
  if (!body || typeof body !== 'object') {
    throw APIErrors.INVALID_INPUT('Request body is required');
  }

  const { token } = body as Record<string, unknown>;

  return {
    token: validateRequired(token, 'Token'),
  };
}

/**
 * Validate member status update request body
 */
export interface UpdateMemberStatusRequestBody {
  status: 'active' | 'suspended';
}

export function validateUpdateMemberStatusRequest(body: unknown): UpdateMemberStatusRequestBody {
  if (!body || typeof body !== 'object') {
    throw APIErrors.INVALID_INPUT('Request body is required');
  }

  const { status } = body as Record<string, unknown>;

  if (status !== 'active' && status !== 'suspended') {
    throw APIErrors.INVALID_INPUT('Status must be either "active" or "suspended"');
  }

  return { status };
}
