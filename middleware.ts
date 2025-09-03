import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ALWAYS call getUser to refresh the session
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to signin if not authenticated
  const protectedPaths = ['/dashboard', '/profile', '/projects', '/chatbot', '/graph', '/notifications', '/project-board', '/onboarding']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Auth pages - redirect to dashboard if authenticated
  const authPaths = ['/auth/signin', '/auth/signup']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (user && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Root page - redirect to dashboard if authenticated
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}