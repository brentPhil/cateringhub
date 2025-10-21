import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Password Reset Callback Handler
 *
 * This route handles the redirect after Supabase's /auth/v1/verify endpoint.
 *
 * Flow:
 * 1. User requests password reset via /forgot-password
 * 2. Supabase sends email with link to Supabase's /auth/v1/verify endpoint
 * 3. User clicks link → Supabase verifies token → Redirects here with token_hash
 * 4. This route exchanges token_hash for a session using verifyOtp()
 * 5. On success, redirects to /reset-password where user can set new password
 * 6. On failure, redirects to /auth/error
 *
 * Query Parameters (from Supabase redirect):
 * - token_hash: The hashed token to exchange for a session
 * - type: Should be 'recovery' for password reset
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔐 [Reset Callback] ========== PASSWORD RESET CALLBACK STARTED ==========')

    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null

    console.log('📋 [Reset Callback] Request URL:', requestUrl.toString())
    console.log('🌐 [Reset Callback] Request origin:', requestUrl.origin)
    console.log('🌐 [Reset Callback] Request pathname:', requestUrl.pathname)
    console.log('📝 [Reset Callback] Query params:', Object.fromEntries(requestUrl.searchParams))
    console.log('🔑 [Reset Callback] Token hash present:', !!token_hash)
    console.log('🔑 [Reset Callback] Token hash length:', token_hash?.length || 0)
    console.log('📝 [Reset Callback] Type:', type)

    console.log('🔄 [Reset Callback] Creating Supabase client...')
    const supabase = await createClient()
    console.log('✅ [Reset Callback] Supabase client created')

    // Check if we have token_hash from Supabase redirect
    if (token_hash && type) {
      console.log('✅ [Reset Callback] Token hash found - using PKCE flow')
      console.log('🔄 [Reset Callback] Verifying OTP token...')
      console.log('🔑 [Reset Callback] Token hash (first 10 chars):', token_hash.substring(0, 10) + '...')

      // Exchange token_hash for a session
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      })

      if (error) {
        console.error('❌ [Reset Callback] Error verifying token!')
        console.error('❌ [Reset Callback] Error message:', error.message)
        console.error('❌ [Reset Callback] Error name:', error.name)
        console.error('❌ [Reset Callback] Error status:', error.status)

        let errorMessage = 'Invalid+or+expired+password+reset+link'
        if (error.message.includes('expired')) {
          errorMessage = 'Password+reset+link+has+expired.+Please+request+a+new+one.'
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Invalid+password+reset+link.+Please+request+a+new+one.'
        }

        return NextResponse.redirect(
          new URL(`/auth/error?message=${errorMessage}`, request.url)
        )
      }

      console.log('✅ [Reset Callback] Token verified successfully!')
      console.log('📊 [Reset Callback] Verification data:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email,
      })

      if (!data.session) {
        console.error('❌ [Reset Callback] No session returned after token verification!')
        return NextResponse.redirect(
          new URL('/auth/error?message=Failed+to+create+session', request.url)
        )
      }

      console.log('✅ [Reset Callback] Session created successfully!')
      console.log('👤 [Reset Callback] User ID:', data.user?.id)
      console.log('📧 [Reset Callback] User email:', data.user?.email)
      console.log('➡️  [Reset Callback] Redirecting to /reset-password...')

      const redirectUrl = new URL('/reset-password', request.url)
      console.log('🔗 [Reset Callback] Full redirect URL:', redirectUrl.toString())
      console.log('🔐 [Reset Callback] ========== PASSWORD RESET CALLBACK COMPLETED ==========')

      return NextResponse.redirect(redirectUrl)
    }

    // Fallback: Check if session already exists (old flow)
    console.log('⚠️  [Reset Callback] No token_hash found - checking for existing session...')
    console.log('🔄 [Reset Callback] Checking for active session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    console.log('📊 [Reset Callback] Session check result:', {
      hasSession: !!session,
      hasError: !!sessionError,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expiresAt: session?.expires_at,
    })

    if (sessionError) {
      console.error('❌ [Reset Callback] Session error:', sessionError)
      console.error('❌ [Reset Callback] Error message:', sessionError.message)
      return NextResponse.redirect(
        new URL('/auth/error?message=Failed+to+verify+password+reset+session', request.url)
      )
    }

    if (!session) {
      console.error('❌ [Reset Callback] No active session found!')
      console.error('❌ [Reset Callback] No token_hash in URL and no existing session')
      console.error('❌ [Reset Callback] This means the password reset link is invalid')
      return NextResponse.redirect(
        new URL('/auth/error?message=Invalid+or+expired+password+reset+link', request.url)
      )
    }

    console.log('✅ [Reset Callback] Active session found!')
    console.log('👤 [Reset Callback] User ID:', session.user?.id)
    console.log('📧 [Reset Callback] User email:', session.user?.email)
    console.log('➡️  [Reset Callback] Redirecting to /reset-password...')

    const redirectUrl = new URL('/reset-password', request.url)
    console.log('🔗 [Reset Callback] Full redirect URL:', redirectUrl.toString())
    console.log('🔐 [Reset Callback] ========== PASSWORD RESET CALLBACK COMPLETED ==========')

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('💥 [Reset Callback] ========== UNEXPECTED ERROR ==========')
    console.error('💥 [Reset Callback] Error:', err)
    console.error('💥 [Reset Callback] Error name:', (err as Error).name)
    console.error('💥 [Reset Callback] Error message:', (err as Error).message)
    console.error('💥 [Reset Callback] Error stack:', (err as Error).stack)
    console.error('💥 [Reset Callback] Redirecting to error page...')

    return NextResponse.redirect(
      new URL('/auth/error?message=An+unexpected+error+occurred', request.url)
    )
  }
}

