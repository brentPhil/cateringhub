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

export async function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl

  // First, update the session to ensure cookies are properly handled
  const response = await updateSession(request)

  // Check if the current path is in the public routes list
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname === `${route}/`
  )

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

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
