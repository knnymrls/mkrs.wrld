'use client';

import { useAuth } from './context/AuthContext';
import dynamic from 'next/dynamic';

// Dynamically import landing page to avoid SSR issues
const LandingPage = dynamic(() => import('./landing/page'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-pulse">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
            </div>
        </div>
    ),
});

export default function RootPage() {
    const { user, loading } = useAuth();

    // Show loading state while auth is being checked
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse">
                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                </div>
            </div>
        );
    }

    // Middleware handles redirects, so authenticated users shouldn't see this
    // This is just a fallback - show landing page
    return <LandingPage />;
}