import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = '/dashboard'
  
  // Create redirect link without the secret token
  const redirectTo = new URL(request.url)
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  
  if (token_hash && type) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })
    
    if (!error) {
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }
  
  // Return the user to an error page with some instructions
  redirectTo.pathname = '/auth/error'
  return NextResponse.redirect(redirectTo)
}
