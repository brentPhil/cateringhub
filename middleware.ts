import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// List of public routes that should redirect to dashboard if user is logged in
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/',
  '/auth/error',
  '/auth/reset-password'
]

// List of routes that should be accessible to authenticated users without redirect
// const AUTHENTICATED_ROUTES = [
//   '/onboarding/provider'
// ] // TODO: Use this when implementing more complex routing logic

export async function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl

  // First, update the session to ensure cookies are properly handled
  const response = await updateSession(request)

  // Check if the current path is in the public routes list
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname === `${route}/`
  )

  // Note: AUTHENTICATED_ROUTES are handled by individual page components

  // Only check authentication for public routes
  if (isPublicRoute) {
    // Check if user is authenticated by looking for Supabase auth cookies
    // Supabase uses multiple cookies for session management
    const hasAuthCookie =
      request.cookies.has('sb-access-token') ||
      request.cookies.has('sb-refresh-token') ||
      request.cookies.has('sb-auth-token');

    // If there's a session cookie and user is trying to access a public route, redirect to dashboard
    if (hasAuthCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // For authenticated routes, allow access without redirect
  // The individual pages will handle their own authentication checks

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
