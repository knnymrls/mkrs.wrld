import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // This route is just a placeholder for now
  // The Supabase client-side SDK will handle the auth tokens
  const requestUrl = new URL(request.url)
  
  // Redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}