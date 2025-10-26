/**
 * Supabase Admin Client
 * 
 * SECURITY WARNING: This file uses the service role key which bypasses RLS.
 * NEVER expose this client or its functions to the client-side.
 * Only use in server-side API routes and server actions.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Validate that service role key is available
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.'
  );
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
}

/**
 * Create Supabase admin client with service role key
 * This client bypasses Row Level Security (RLS) policies
 * 
 * @returns Supabase client with admin privileges
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Invite a user to join a provider team
 *
 * Creates a user account without a password and sends a welcome email.
 * The user can then log in using Google OAuth or set up a password themselves.
 *
 * The membership is created with status 'pending' and will be automatically
 * activated when the user logs in for the first time (via handleFirstLogin).
 *
 * @param email - User's email address
 * @param metadata - User metadata (stored in user_metadata)
 * @returns Created user object with ID and email
 */
export async function inviteTeamMember(
  email: string,
  metadata: {
    full_name: string;
    role: string;
    provider_id: string;
    provider_name: string;
    admin_name: string;
  }
): Promise<{ userId: string; email: string }> {
  const adminClient = createAdminClient();

  // Create user account without password
  // User can log in via Google OAuth or set up password themselves
  const { data, error } = await adminClient.auth.admin.createUser({
    email: email,
    email_confirm: true, // Auto-confirm email since admin is creating the account
    user_metadata: metadata,
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('User creation failed: No user data returned');
  }

  // Send welcome email via Resend
  const { sendWelcomeEmail } = await import('@/lib/email/service');
  await sendWelcomeEmail({
    to: email,
    fullName: metadata.full_name,
    providerName: metadata.provider_name,
    role: metadata.role,
    adminName: metadata.admin_name,
  });

  return {
    userId: data.user.id,
    email: data.user.email!,
  };
}

/**
 * Get user by ID using admin client
 * 
 * @param userId - User ID to fetch
 * @returns User object
 */
export async function getUserById(userId: string): Promise<{
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.getUserById(userId);

  if (error) {
    console.error('Error fetching user:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('User not found');
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    user_metadata: data.user.user_metadata,
  };
}

/**
 * Delete a user account (use with caution)
 * 
 * @param userId - User ID to delete
 */
export async function deleteUser(userId: string): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

