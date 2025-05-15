import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a response object that we'll modify as needed
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create cookie handlers for the middleware context
  const cookieStore = {
    get(name: string) {
      return request.cookies.get(name)?.value
    },
    set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' }) {
      // When setting cookies from middleware, we need to set them on both
      // the request and the response to ensure they are sent to the browser
      // and also available for any Server Components or Server Actions
      request.cookies.set({
        name,
        value,
        ...options,
      })

      // We need to create a new response with the updated request headers
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })

      // Also set the cookie on the response
      response.cookies.set({
        name,
        value,
        ...options,
      })
    },
    remove(name: string, options: { path?: string; domain?: string }) {
      // Same pattern for removing cookies
      request.cookies.set({
        name,
        value: '',
        ...options,
      })

      // We need to create a new response with the updated request headers
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })

      // Also remove the cookie from the response
      response.cookies.set({
        name,
        value: '',
        ...options,
      })
    },
  }

  // Create the Supabase client using the standard createClient function
  // with custom cookie handling for middleware
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: {
          getItem: (key) => {
            return cookieStore.get(key) || null
          },
          setItem: (key, value) => {
            cookieStore.set(key, value, {
              path: '/',
              maxAge: 60 * 60 * 24 * 365, // 1 year
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production'
            })
          },
          removeItem: (key) => {
            cookieStore.remove(key, { path: '/' })
          },
        },
      },
    }
  )

  // Refresh the session - this is important to trigger the cookie refresh
  await supabase.auth.getUser()

  return response
}
