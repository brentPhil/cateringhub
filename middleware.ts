import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// List of public routes that should redirect to dashboard if user is logged in
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/',
  '/auth/error',
]

// Routes that need to be accessible during password reset flow
// These should NOT redirect to dashboard even if user has a session
const PASSWORD_RESET_ROUTES = [
  '/auth/reset-password',
  '/reset-password',
  '/forgot-password'
]

// List of routes that should be accessible to authenticated users without redirect
// const AUTHENTICATED_ROUTES = [
//   '/onboarding/provider'
// ] // TODO: Use this when implementing more complex routing logic

export async function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl

  console.log('🛡️  [Middleware] ========== REQUEST INTERCEPTED ==========')
  console.log('🛡️  [Middleware] Pathname:', pathname)
  console.log('🛡️  [Middleware] Full URL:', request.url)

  // First, update the session to ensure cookies are properly handled
  const response = await updateSession(request)

  // Check if the current path is a password reset route
  const isPasswordResetRoute = PASSWORD_RESET_ROUTES.some(route =>
    pathname === route || pathname === `${route}/`
  )

  console.log('🛡️  [Middleware] Is password reset route:', isPasswordResetRoute)

  // Password reset routes should always be accessible, regardless of auth state
  if (isPasswordResetRoute) {
    console.log('✅ [Middleware] Password reset route - allowing access without redirect')
    console.log('🛡️  [Middleware] ========== REQUEST ALLOWED ==========')
    return response
  }

  // Check if the current path is in the public routes list
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname === `${route}/`
  )

  console.log('🛡️  [Middleware] Is public route:', isPublicRoute)

  // Note: AUTHENTICATED_ROUTES are handled by individual page components

  // Only check authentication for public routes
  if (isPublicRoute) {
    // Check if user is authenticated by looking for Supabase auth cookies
    // Supabase uses multiple cookies for session management
    const hasAuthCookie =
      request.cookies.has('sb-access-token') ||
      request.cookies.has('sb-refresh-token') ||
      request.cookies.has('sb-auth-token');

    console.log('🛡️  [Middleware] Has auth cookie:', hasAuthCookie)
    console.log('🛡️  [Middleware] Cookies:', {
      'sb-access-token': request.cookies.has('sb-access-token'),
      'sb-refresh-token': request.cookies.has('sb-refresh-token'),
      'sb-auth-token': request.cookies.has('sb-auth-token'),
    })

    // If there's a session cookie and user is trying to access a public route, redirect to dashboard
    if (hasAuthCookie) {
      console.log('🔄 [Middleware] Authenticated user on public route - redirecting to dashboard')
      console.log('🛡️  [Middleware] ========== REDIRECTING TO DASHBOARD ==========')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // For authenticated routes, allow access without redirect
  // The individual pages will handle their own authentication checks

  console.log('✅ [Middleware] Allowing request to proceed')
  console.log('🛡️  [Middleware] ========== REQUEST ALLOWED ==========')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
