import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  isPublicRoute, 
  isProtectedRoute, 
  isAuthPageRoute,
  AUTH_ROUTES,
  DEFAULT_REDIRECT 
} from './app/lib/auth-config';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get the user - more reliable than getSession
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && isAuthPageRoute(path)) {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT.signIn, req.url));
  }

  // If user is not authenticated and trying to access protected route, redirect to signin
  if (!user && isProtectedRoute(path)) {
    // Store the intended destination
    const redirectUrl = new URL(AUTH_ROUTES.signIn, req.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle root path
  if (path === '/') {
    if (user) {
      // Authenticated users go to dashboard
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT.signIn, req.url));
    }
    // Unauthenticated users stay on root (shows landing)
  }

  // Handle /landing path - authenticated users go to dashboard
  if (path === '/landing' && user) {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT.signIn, req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};