'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function AuthHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Get redirect URL from query params or default to dashboard
        const redirectTo = searchParams.get('redirectTo') || '/dashboard';
        router.push(redirectTo);
      } else if (event === 'SIGNED_OUT') {
        // Redirect to home on sign out
        router.push('/');
      }
    });

    // Check if we have auth tokens in the URL hash
    if (typeof window !== 'undefined' && window.location.hash) {
      // The Supabase client will handle the tokens automatically
      // Just clean up the URL
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState({}, '', cleanUrl);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return null;
}

export function AuthHandler() {
  return (
    <Suspense fallback={null}>
      <AuthHandlerInner />
    </Suspense>
  );
}