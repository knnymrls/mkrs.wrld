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

const imgFrame48 = "https://www.figma.com/api/mcp/asset/a861c220-cd20-465c-8274-e367c945777a";
const imgFrame49 = "https://www.figma.com/api/mcp/asset/f90abe44-7d4d-4d25-b3ba-57fb1d78959d";
const imgFrame50 = "https://www.figma.com/api/mcp/asset/6de59e71-6ad9-4fec-b80e-c589819c4a96";
const imgFrame51 = "https://www.figma.com/api/mcp/asset/264644e2-452a-4999-b63f-0dc3d7e3bcb9";
const imgFrame53 = "https://www.figma.com/api/mcp/asset/f2390c18-2b32-4ae6-ae73-1173fcb2edd3";
const imgFrame54 = "https://www.figma.com/api/mcp/asset/d7510936-2395-49b3-ab23-fdcda7e5bcf5";
const imgFrame55 = "https://www.figma.com/api/mcp/asset/252ad117-164b-473d-9ec1-4389ace10d0b";
const imgFrame56 = "https://www.figma.com/api/mcp/asset/5eb99b99-8fa1-4461-8d3b-928d42bcb07f";
const imgFrame57 = "https://www.figma.com/api/mcp/asset/2a65276c-8668-4922-b2cd-f24eacca5353";
const imgFrame58 = "https://www.figma.com/api/mcp/asset/03cfaf4e-2c3b-4203-a4c3-6b7717050d60";
const imgFrame35 = "https://www.figma.com/api/mcp/asset/d5813604-3308-4d46-b37e-9bcdff3f801b";

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
                    <Link href="/landing" className="w-[467px] h-6">
                        <img alt="mkrs.world" className="block max-w-none w-full h-full cursor-pointer dark:invert" src={imgFrame35} />
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

                {/* Background Globe with Images */}
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-0">
                    <HexGlobe images={[
                        imgFrame48,
                        imgFrame49,
                        imgFrame50,
                        imgFrame51,
                        imgFrame53,
                        imgFrame54,
                        imgFrame55,
                        imgFrame56,
                        imgFrame57,
                        imgFrame58
                    ]} />
                </div>
            </div>
        </div>
    );
}