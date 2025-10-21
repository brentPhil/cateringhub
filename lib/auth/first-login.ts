/**
 * First Login Detection
 * Handles activation of admin-created members on their first successful login
 */

'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Check and handle first login for admin-created members
 * This should be called after successful authentication
 * 
 * @param userId - User ID to check
 * @returns true if this was a first login that was handled, false otherwise
 */
export async function handleFirstLogin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Find all pending admin-created memberships for this user
    const { data: pendingMemberships, error: queryError } = await supabase
      .from('provider_members')
      .select('id, provider_id, user_id, role, status, invitation_method, first_login_at')
      .eq('user_id', userId)
      .eq('invitation_method', 'admin_created')
      .eq('status', 'pending')
      .is('first_login_at', null);

    if (queryError) {
      console.error('Error querying pending memberships:', queryError);
      return false;
    }

    // If no pending admin-created memberships, nothing to do
    if (!pendingMemberships || pendingMemberships.length === 0) {
      return false;
    }

    // Update all pending memberships to active
    const now = new Date().toISOString();
    const membershipIds = pendingMemberships.map(m => m.id);

    const { error: updateError } = await supabase
      .from('provider_members')
      .update({
        status: 'active',
        first_login_at: now,
        updated_at: now,
      })
      .in('id', membershipIds);

    if (updateError) {
      console.error('Error updating memberships on first login:', updateError);
      return false;
    }

    console.log(`[FIRST LOGIN] Activated ${pendingMemberships.length} membership(s) for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error handling first login:', error);
    return false;
  }
}

/**
 * Check if user has any pending admin-created memberships
 * This can be used to show a welcome message or onboarding flow
 * 
 * @param userId - User ID to check
 * @returns true if user has pending admin-created memberships
 */
export async function hasPendingAdminCreatedMembership(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('provider_members')
      .select('id')
      .eq('user_id', userId)
      .eq('invitation_method', 'admin_created')
      .eq('status', 'pending')
      .is('first_login_at', null)
      .limit(1);

    if (error) {
      console.error('Error checking pending memberships:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking pending memberships:', error);
    return false;
  }
}

