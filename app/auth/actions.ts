'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole, AppPermission, ProviderRoleType } from '@/types'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes: 'profile email', // Request access to profile info including image
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}

export async function signInWithFacebook() {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for the confirmation link.' }
}

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

async function getUserPermissionsForRole(role: AppRole, provider_role?: ProviderRoleType | null): Promise<AppPermission[]> {
  const supabase = createClient()

  // For catering_provider role, get provider sub-role permissions
  if (role === 'catering_provider' && provider_role) {
    const { data, error } = await supabase
      .from('provider_role_permissions')
      .select('permission')
      .eq('provider_role', provider_role)

    if (error) throw error
    return data.map(p => p.permission as AppPermission)
  }

  // For other roles, get regular role permissions
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role', role)

  if (error) throw error
  return data.map(p => p.permission as AppPermission)
}

export async function getUserRole(): Promise<{
  role: AppRole;
  provider_role: ProviderRoleType | null;
  permissions: AppPermission[];
} | null> {
  const supabase = createClient()

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      console.log("No session available:", error?.message || "Session is null")
      return null
    }

    // Get the JWT and decode it following Supabase RBAC patterns
    const token = session.access_token
    const payload = token.split('.')[1]

    if (!payload) {
      return null
    }

    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>
    const role = (decoded.user_role as AppRole) || 'user'
    const provider_role = (decoded.provider_role as ProviderRoleType) || null

    // Get permissions for this role
    const permissions = await getUserPermissionsForRole(role, provider_role)

    return {
      role,
      provider_role,
      permissions,
    }
  } catch (error) {
    console.log("Error getting user role:", error)
    return null
  }
}

export async function getUserPermissions(): Promise<AppPermission[]> {
  const userRoleData = await getUserRole()
  return userRoleData?.permissions || []
}

export async function refreshSession() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Error refreshing session:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error refreshing session:", error)
    throw error
  }
}

export async function hasPermission(permission: AppPermission): Promise<boolean> {
  const permissions = await getUserPermissions()
  return permissions.includes(permission)
}
