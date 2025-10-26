'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IS_DEV } from '@/lib/constants'

export async function login(formData: FormData) {
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}



export async function refreshSession() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      if (IS_DEV) console.error("Error refreshing session:", error)
      throw error
    }

    return data
  } catch (error) {
    if (IS_DEV) console.error("Error refreshing session:", error)
    throw error
  }
}



// Debug function - should be removed in production
export async function debugJwtToken() {
  const supabase = await createClient()

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    // Decode JWT token details
    const token = session.access_token
    const payload = token.split('.')[1]

    if (!payload) {
      return null
    }

    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>

    if (IS_DEV) console.log("[DEBUG] JWT Token Debug Info:", {
      user_role: decoded.user_role,
      provider_role: decoded.provider_role,
      sub: decoded.sub,
      email: decoded.email,
      exp: decoded.exp ? new Date((decoded.exp as number) * 1000).toISOString() : 'unknown',
      iat: decoded.iat ? new Date((decoded.iat as number) * 1000).toISOString() : 'unknown',
      token_length: token.length,
      token_preview: token.substring(0, 50) + "..."
    })

    return decoded
  } catch (error) {
    if (IS_DEV) console.error("❌ Error debugging JWT token:", error)
    return null
  }
}

export async function forceJwtRefresh(): Promise<boolean> {
  const supabase = await createClient()

  try {
    if (IS_DEV) console.log("🔄 Forcing JWT refresh...")

    // First, let's check the current configuration
    if (IS_DEV) console.log("🔧 Supabase Configuration Check:")
    if (IS_DEV) console.log("- URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...")
    if (IS_DEV) console.log("- Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + "...")

    // Refresh the session to get a new JWT with updated claims
    const { error } = await supabase.auth.refreshSession()

    if (error) {
      if (IS_DEV) console.error("❌ Failed to refresh session:", error)
      return false
    }

    if (IS_DEV) console.log("✅ Session refresh completed")

    // Wait a moment for the new JWT to be available
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify the new JWT has the correct claims
    const newToken = await debugJwtToken()

    if (newToken && newToken.user_role === 'admin') {
      if (IS_DEV) console.log("✅ JWT refresh successful - admin role confirmed")
      return true
    } else {
      if (IS_DEV) console.warn("⚠️ JWT refresh completed but admin role not found")
      if (IS_DEV) console.log("🔍 Current JWT claims:", newToken)
      return false
    }
  } catch (error) {
    if (IS_DEV) console.error("❌ Error during JWT refresh:", error)
    return false
  }
}

export async function testSupabaseConnection(): Promise<boolean> {
  const supabase = await createClient()

  try {
    if (IS_DEV) console.log("[TEST] Testing Supabase connection...")

    // Test basic connection
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      if (IS_DEV) console.error("[ERROR] Connection test failed:", error)
      return false
    }

    if (IS_DEV) console.log("[SUCCESS] Supabase connection successful")
    if (IS_DEV) console.log("[DATA] Session data:", {
      hasSession: !!data.session,
      hasUser: !!data.session?.user,
      userEmail: data.session?.user?.email,
      tokenLength: data.session?.access_token?.length
    })

    return true
  } catch (error) {
    if (IS_DEV) console.error("[ERROR] Connection test error:", error)
    return false
  }
}
