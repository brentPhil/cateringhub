'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ProfileUpdateData {
  id?: string | undefined
  full_name?: string
  username?: string
  bio?: string
  avatar_url?: string
}

export async function updateProfile(data: ProfileUpdateData) {
  const supabase = await createClient()
  
  if (!data.id) {
    throw new Error('User ID is required')
  }

  // Extract the data we want to update
  const { id, ...profileData } = data
  
  // Add updated_at timestamp
  const updateData = {
    ...profileData,
    updated_at: new Date().toISOString(),
  }

  // Update the profile in the database
  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }

  // Revalidate the settings page to show updated data
  revalidatePath('/dashboard/settings')
  
  return { success: true }
}
