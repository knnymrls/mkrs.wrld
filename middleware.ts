import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/chatbot',
    '/graph',
    '/project-requests',
    '/onboarding',
    '/projects',
    '/project-board',
    '/notifications',
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // If user is not authenticated and trying to access protected route
  if (!session && isProtectedRoute) {
    // Redirect to landing page
    return NextResponse.redirect(new URL('/landing', req.url));
  }

  // Landing page logic
  if (req.nextUrl.pathname === '/landing') {
    // If authenticated user visits /landing, redirect to main app
    if (session) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Unauthenticated users can stay on landing
    return res;
  }

  // Root page logic - no redirect needed
  // The root page component will handle showing landing or app based on auth state

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
};