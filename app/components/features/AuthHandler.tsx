'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function AuthHandler() {
  const router = useRouter();

  useEffect(() => {
    // Check if we have auth tokens in the URL hash
    if (typeof window !== 'undefined' && window.location.hash) {
      // The Supabase client with detectSessionInUrl will handle this automatically
      // Just clean up the URL
      const cleanUrl = window.location.pathname + window.location.search;
      router.replace(cleanUrl);
    }
  }, [router]);

  return null;
}