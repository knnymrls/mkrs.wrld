'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import HexGlobe to avoid any hydration issues
const HexGlobe = dynamic(() => import('@/app/components/ui/HexGlobe'), {
    ssr: false,
    loading: () => <div className="h-[400px]" />
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
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary rounded-xl text-background dark:text-background">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Earth-1--Streamline-Flex-Remix" height="24" width="24">
                                    <desc>
                                        Earth 1 Streamline Icon: https://streamlinehq.com
                                    </desc>
                                    <g id="earth-1--planet-earth-globe-world">
                                        <path id="Union" fill="currentColor" fillRule="evenodd" d="M14.261982857142856 2.3047028571428574c0.07179428571428571 0.6572228571428571 0.10616571428571428 1.3409828571428573 0.05595428571428571 2.003091428571428 -0.08259428571428572 1.0887942857142856 -0.3978342857142857 2.16948 -1.202622857142857 2.9742514285714283 -0.62736 0.62736 -1.4782457142857142 0.9798171428571427 -2.3654571428571427 0.9798171428571427 -0.6598971428571428 0 -1.29276 0.2621314285714285 -1.7593885714285715 0.728742857142857 -0.4666114285714285 0.4666285714285714 -0.72876 1.0994914285714286 -0.72876 1.7593885714285715v2.5000285714285715c0 0.8872285714285713 -0.35244 1.7381142857142857 -0.9798 2.365474285714286 -1.0711371428571428 1.07112 -2.61456 1.6137599999999999 -4.178708571428571 1.424862857142857 0.4063885714285714 0.8938114285714286 0.9338914285714285 1.6558114285714285 1.5672685714285715 2.28924C6.273291428571428 20.93228571428571 8.700068571428572 21.857142857142858 12 21.857142857142858c2.6226342857142857 0 4.693765714285714 -0.5840571428571428 6.2381142857142855 -1.6285714285714283v-1.1453142857142857c0 -0.43885714285714283 -0.17434285714285713 -0.8597142857142855 -0.48479999999999995 -1.17 -0.3102857142857143 -0.3104571428571429 -0.7311599999999999 -0.48479999999999995 -1.1700342857142856 -0.48479999999999995 -0.8872285714285713 0 -1.7381142857142857 -0.35237142857142856 -2.365474285714286 -0.9797314285714285 -0.62736 -0.62736 -0.9798 -1.4782457142857142 -0.9798 -2.365474285714286 0 -0.8872114285714285 0.35244 -1.7380971428571428 0.9798 -2.3654571428571427 0.4925828571428571 -0.4926 1.1831314285714285 -0.8021999999999999 1.9316399999999998 -0.9862971428571428 0.7530171428571428 -0.18521142857142855 1.5985542857142856 -0.2518457142857143 2.43924 -0.23304 1.1288571428571428 0.025234285714285713 2.2856571428571426 0.20578285714285713 3.237942857142857 0.48665142857142857 -0.17211428571428572 -2.787702857142857 -1.0633714285714284 -4.880828571428571 -2.497028571428571 -6.314639999999999 -1.2114857142857143 -1.2114171428571427 -2.8935942857142853 -2.035525714285714 -5.067617142857142 -2.3657657142857142Zm-11.106737142857142 0.850542857142857C5.268137142857142 1.0423542857142858 8.305645714285715 0 12 0s6.73182857142857 1.0423542857142858 8.844685714285713 3.155245714285714C22.95771428571428 5.268137142857142 24 8.305645714285715 24 12s-1.0422857142857143 6.73182857142857 -3.1553142857142857 8.844685714285713C18.73182857142857 22.95771428571428 15.694354285714285 24 12 24c-3.6943542857142857 0 -6.731862857142857 -1.0422857142857143 -8.844754285714286 -3.1553142857142857C1.0423542857142858 18.73182857142857 0 15.694354285714285 0 12c0 -3.6943542857142857 1.0423542857142858 -6.731862857142857 3.155245714285714 -8.844754285714286Z" clipRule="evenodd" strokeWidth="1.7143"></path>
                                    </g>
                                </svg>
                            </div>
                            <span className="text-xl font-semibold text-onsurface-primary">mkrs.world</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/auth/signin"
                                className="px-4 py-2 text-sm font-medium text-onsurface-secondary hover:text-onsurface-primary transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="px-4 py-2 text-sm font-medium bg-primary text-background dark:text-background rounded-lg hover:bg-primary-hover transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="min-h-[700px] mt-16 px-4 sm:px-6 lg:px-8 relative flex items-center justify-center overflow-hidden">
                {/* Globe Background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="mt-80 opacity-30">
                        <HexGlobe />
                    </div>
                </div>

                {/* Bottom gradient fade to background color */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl sm:text-6xl font-bold text-onsurface-primary mb-6">
                        Connect. Create. Collaborate.
                    </h1>
                    <p className="text-xl text-onsurface-secondary max-w-3xl mx-auto mb-8">
                        Join a community of makers, builders, and creators. Share your projects,
                        discover inspiring work, and collaborate with talented individuals from around the world.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/auth/signup"
                            className="px-8 py-4 text-lg font-medium bg-primary text-background dark:text-background rounded-lg hover:bg-primary-hover transition-colors"
                        >
                            Start Building Today
                        </Link>
                        <Link
                            href="/auth/signin"
                            className="px-8 py-4 text-lg font-medium bg-surface-container text-onsurface-primary rounded-lg hover:bg-surface-container-muted transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Vision Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-onsurface-primary mb-6">
                        Building the Future of Creative Collaboration
                    </h2>
                    <p className="text-lg text-onsurface-secondary mb-8">
                        We're creating a space where makers, builders, and creators can connect authentically,
                        share their journey, and find their tribe. Be part of something new from the ground up.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium text-primary">Early Access - Join the First Wave of Makers</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-container">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-onsurface-primary mb-12">
                        Everything you need to showcase your work
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Build Your Network
                            </h3>
                            <p className="text-onsurface-secondary">
                                Connect with like-minded creators and expand your professional network in the maker community.
                            </p>
                        </div>

                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Share Your Ideas
                            </h3>
                            <p className="text-onsurface-secondary">
                                Post updates, share insights, and get feedback from a supportive community of makers.
                            </p>
                        </div>

                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Discover Connections
                            </h3>
                            <p className="text-onsurface-secondary">
                                Explore the network graph to find collaborators, mentors, and opportunities that match your interests.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-onsurface-primary mb-12">
                        How It Works
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary">1</span>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Create Your Profile
                            </h3>
                            <p className="text-onsurface-secondary">
                                Sign up and build your maker profile. Add your skills, interests, and showcase your best work.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary">2</span>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Share & Discover
                            </h3>
                            <p className="text-onsurface-secondary">
                                Post your projects, share updates, and discover amazing work from makers around the world.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary">3</span>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Collaborate & Grow
                            </h3>
                            <p className="text-onsurface-secondary">
                                Connect with other makers, join projects, and grow together through collaboration.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Join Early Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-container">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-onsurface-primary mb-12">
                        Why Join Early?
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Be First
                            </h3>
                            <p className="text-onsurface-secondary">
                                Shape the platform from day one. Your feedback will directly influence how we build the future of maker collaboration.
                            </p>
                        </div>
                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Exclusive Access
                            </h3>
                            <p className="text-onsurface-secondary">
                                Get early access to new features, beta tools, and exclusive events for founding members.
                            </p>
                        </div>
                        <div className="bg-background p-6 rounded-lg border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-onsurface-primary mb-2">
                                Grow Together
                            </h3>
                            <p className="text-onsurface-secondary">
                                Build meaningful connections in a smaller, more intimate community before it scales globally.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-onsurface-primary mb-12">
                        Perfect For Every Maker
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-6 border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <h3 className="font-semibold text-onsurface-primary mb-2">Developers</h3>
                            <p className="text-sm text-onsurface-secondary">Share your open source projects and find contributors</p>
                        </div>
                        <div className="p-6 border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <h3 className="font-semibold text-onsurface-primary mb-2">Designers</h3>
                            <p className="text-sm text-onsurface-secondary">Showcase your portfolio and connect with clients</p>
                        </div>
                        <div className="p-6 border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <h3 className="font-semibold text-onsurface-primary mb-2">Entrepreneurs</h3>
                            <p className="text-sm text-onsurface-secondary">Find co-founders and early team members</p>
                        </div>
                        <div className="p-6 border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <h3 className="font-semibold text-onsurface-primary mb-2">Students</h3>
                            <p className="text-sm text-onsurface-secondary">Build your network and learn from experienced makers</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-onsurface-primary mb-4">
                        Ready to join the maker community?
                    </h2>
                    <p className="text-lg text-onsurface-secondary mb-8">
                        Start building your profile and connect with creators worldwide.
                    </p>
                    <Link
                        href="/auth/signup"
                        className="inline-block px-8 py-4 text-lg font-medium bg-primary text-background dark:text-background rounded-lg hover:bg-primary-hover transition-colors"
                    >
                        Create Your Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center text-onsurface-secondary">
                    <p>&copy; 2024 mkrs.world. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}