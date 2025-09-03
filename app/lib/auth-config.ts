// Centralized authentication configuration

export const AUTH_ROUTES = {
  signIn: '/auth/signin',
  signUp: '/auth/signup',
  signOut: '/auth/signout',
  callback: '/auth/callback',
  verifyEmail: '/auth/verify-email',
} as const;

export const PUBLIC_ROUTES = [
  '/',
  '/landing',
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  AUTH_ROUTES.verifyEmail,
  AUTH_ROUTES.callback,
] as const;

export const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/chatbot',
  '/graph',
  '/project-requests',
  '/onboarding',
  '/projects',
  '/project-board',
  '/notifications',
] as const;

export const DEFAULT_REDIRECT = {
  signIn: '/dashboard',
  signOut: '/',
} as const;

// Routes that should redirect to dashboard if user is already authenticated
export const AUTH_PAGE_ROUTES = [
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
] as const;

// Helper functions
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}

export function isAuthPageRoute(pathname: string): boolean {
  return AUTH_PAGE_ROUTES.some(route => pathname === route);
}