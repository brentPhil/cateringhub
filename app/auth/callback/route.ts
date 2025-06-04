import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const error_description = requestUrl.searchParams.get('error_description')

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error, error_description)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url)
      )
    }

    // Exchange code for session
    if (code) {
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Error exchanging code for session:', error.message)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
        )
      }

      // If we have a session, check if we need to update the profile with OAuth data
      if (data?.session) {
        try {
          // Get the user data
          const { data: userData } = await supabase.auth.getUser()

          if (userData?.user) {
            const user = userData.user

            // Check if this is a Google or Facebook user
            const isOAuthUser = user.app_metadata.provider === 'google' ||
                               user.app_metadata.provider === 'facebook'

            if (isOAuthUser) {
              // Get the current profile
              const { data: profile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single()

              // If profile doesn't have an avatar_url but we have one from identity data, update it
              if ((!profile?.avatar_url || profile.avatar_url === '') && user.identities && user.identities.length > 0) {
                const identity = user.identities[0]

                if (identity) {
                  const provider = identity.provider
                  const identityData = identity.identity_data

                  // Get avatar URL based on provider
                  let avatarUrl = null
                  if (provider === 'google' && identityData?.picture) {
                    avatarUrl = identityData.picture
                  } else if (provider === 'facebook' && identityData?.picture) {
                    avatarUrl = identityData.picture
                  }

                  // Update profile if we found an avatar URL
                  if (avatarUrl) {
                    await supabase
                      .from('profiles')
                      .update({
                        avatar_url: avatarUrl,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id)
                  }
                }
              }
            }
          }
        } catch (profileError) {
          // Log but don't fail the auth flow if profile update fails
          console.error('Error updating profile with OAuth data:', profileError)
        }
      }
    }

    // URL to redirect to after sign in process completes
    const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (err) {
    console.error('Unexpected error in auth callback:', err)
    return NextResponse.redirect(
      new URL('/login?error=An+unexpected+error+occurred', request.url)
    )
  }
}
