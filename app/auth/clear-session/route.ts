import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Clear Session Route
 * 
 * This route clears the user's session and redirects to login.
 * Useful for fixing "User from sub claim in JWT does not exist" errors.
 * 
 * Usage: Navigate to /auth/clear-session
 */
export async function GET() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to login
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}

