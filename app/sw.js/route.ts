import { NextResponse } from 'next/server'

// Handle requests to /sw.js and return a proper 404 response
// This prevents the middleware from processing service worker requests
export async function GET() {
  return new NextResponse(null, { 
    status: 404,
    statusText: 'Not Found'
  })
}
