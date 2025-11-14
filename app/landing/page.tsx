'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const HexGlobe = dynamic(() => import('../components/ui/HexGlobe'), {
    ssr: false,
    loading: () => null
});

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

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

    return (
        <div className="relative w-full h-screen bg-surface overflow-hidden" style={{ fontFamily: "'Satoshi Variable', sans-serif" }}>
            <div className="relative w-[1280px] h-full mx-auto">
                {/* Navigation */}
                <div className="absolute left-1/2 top-[38px] -translate-x-1/2 w-[1200px] flex items-center justify-between">
                    <Link href="/landing" className="cursor-pointer">
                        <span className="text-2xl font-semibold text-onsurface-primary">mkrs.world</span>
                    </Link>
                    <div className="flex gap-8 items-center">
                        <a href="mailto:knnymrls@outlook.com,wkoverfield@gmail.com?subject=Sponsorship%20Inquiry" className="text-base font-medium text-onsurface-secondary hover:text-onsurface-primary">
                            Sponsor
                        </a>
                        <Link
                            href="/auth/signup"
                            className="bg-primary text-surface px-3.5 py-2.5 rounded-xl text-sm font-medium leading-[1.33] hover:bg-primary-hover transition-colors"
                        >
                            Join the waitlist
                        </Link>
                    </div>
                </div>

                {/* Heading */}
                <h1 className="absolute left-1/2 top-[177px] -translate-x-1/2 w-[655px] text-[84px] leading-none font-medium text-onsurface-primary text-center whitespace-pre-wrap">
                    Connect. Create. Collaborate.
                </h1>

                {/* Description */}
                <p className="absolute left-1/2 top-[369px] -translate-x-1/2 w-[612px] text-lg leading-[1.33] font-medium text-onsurface-secondary text-center whitespace-pre-wrap">
                    We have a group of talented students all over the world in a platform focused on showing rather than telling. Come find your world.
                </p>

                {/* CTAs */}
                <div className="absolute left-1/2 top-[446px] -translate-x-1/2 flex gap-4 items-center">
                    <Link
                        href="/auth/signup"
                        className="bg-primary text-surface px-3.5 py-2.5 rounded-xl text-sm font-medium leading-[1.33] hover:bg-primary-hover transition-colors"
                    >
                        Join the waitlist
                    </Link>
                    <Link href="/events" className="text-sm font-medium leading-[1.33] text-onsurface-primary hover:underline underline-offset-4 transition-all">
                        Come to next event →
                    </Link>
                </div>

                {/* Background Globe */}
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-0">
                    <HexGlobe />
                </div>
            </div>
        </div>
    );
}