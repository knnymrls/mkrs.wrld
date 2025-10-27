'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const imgFrame35 = "https://www.figma.com/api/mcp/asset/d5813604-3308-4d46-b37e-9bcdff3f801b";

export default function EventsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className="min-h-screen bg-surface" style={{ fontFamily: "'Satoshi Variable', sans-serif" }}>
            {/* Navigation */}
            <div className="fixed top-0 left-0 w-full py-4 md:py-10 bg-surface z-50">
                <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8">
                    <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
                        <Link href="/landing" className="w-[200px] md:w-[467px] h-4 md:h-6">
                            <img alt="mkrs.world" className="block max-w-none w-full h-full cursor-pointer dark:invert" src={imgFrame35} />
                        </Link>
                        <div className="flex gap-3 md:gap-8 items-center">
                            <a href="mailto:knnymrls@outlook.com,wkoverfield@gmail.com?subject=Sponsorship%20Inquiry" className="hidden md:block text-base font-medium text-onsurface-secondary hover:text-onsurface-primary">
                                Sponsor
                            </a>
                            <Link
                                href="/auth/signup"
                                className="bg-primary text-surface px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium leading-[1.33] hover:bg-primary-hover transition-colors"
                            >
                                Join the waitlist
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events Content */}
            <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-32">
                <div className="text-center mb-8 md:mb-16">
                    <h1 className="text-4xl md:text-7xl font-bold text-onsurface-primary mb-6 md:mb-8">
                        mkrs. mixer
                    </h1>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center text-onsurface-primary text-base md:text-lg">
                        <div className="flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            December 2nd, 5:30 PM
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Location TBD
                        </div>
                    </div>
                </div>

                <div className="bg-surface-container rounded-2xl p-6 md:p-12 border border-border mb-8">
                    <p className="text-base md:text-xl text-onsurface-primary mb-6 md:mb-8 leading-relaxed text-center max-w-3xl mx-auto">
                        The mkrs. mixer brings together builders, designers, engineers, and creators from every corner of campus. Whether you're in engineering, business, arts, or any other field—if you're making things happen, this is your space.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                        <div className="bg-surface rounded-xl p-6 text-center">
                            <div className="text-4xl font-bold text-onsurface-primary mb-2">50</div>
                            <div className="text-onsurface-secondary">Ambitious Students</div>
                        </div>
                        <div className="bg-surface rounded-xl p-6 text-center">
                            <div className="text-4xl font-bold text-onsurface-primary mb-2">10</div>
                            <div className="text-onsurface-secondary">Community Leaders</div>
                        </div>
                        <div className="bg-surface rounded-xl p-6 text-center">
                            <div className="text-4xl font-bold text-onsurface-primary mb-2">∞</div>
                            <div className="text-onsurface-secondary">Collaboration Opportunities</div>
                        </div>
                    </div>

                    <div className="mb-8 md:mb-12">
                        <h3 className="text-xl md:text-2xl font-bold text-onsurface-primary mb-4 md:mb-6 text-center">
                            What You'll Experience
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-surface font-bold">
                                    1
                                </div>
                                <div>
                                    <h4 className="font-bold text-onsurface-primary mb-2">Connect Across Colleges</h4>
                                    <p className="text-onsurface-secondary">Meet makers from engineering, business, arts, and beyond. Break down silos and find your next collaborator.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-surface font-bold">
                                    2
                                </div>
                                <div>
                                    <h4 className="font-bold text-onsurface-primary mb-2">Shape the Future</h4>
                                    <p className="text-onsurface-secondary">Join discussions on increasing cross-campus collaboration and building a stronger maker community at UNL.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-surface font-bold">
                                    3
                                </div>
                                <div>
                                    <h4 className="font-bold text-onsurface-primary mb-2">Learn from Leaders</h4>
                                    <p className="text-onsurface-secondary">Engage with 10 community leaders who will help facilitate conversations and share insights.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-surface font-bold">
                                    4
                                </div>
                                <div>
                                    <h4 className="font-bold text-onsurface-primary mb-2">Enjoy Dinner Together</h4>
                                    <p className="text-onsurface-secondary">Great conversations happen over great food. Dinner is on us.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary text-surface px-3.5 py-2.5 rounded-xl text-sm font-medium leading-[1.33] hover:bg-primary-hover transition-colors text-center"
                        >
                            RSVP to event
                        </button>
                        <a
                            href="mailto:knnymrls@outlook.com,wkoverfield@gmail.com?subject=MKRS%20Mixer%20-%20Contact%20Organizers"
                            className="bg-surface text-primary px-3.5 py-2.5 rounded-xl text-sm font-medium leading-[1.33] border-2 border-border hover:border-primary transition-colors text-center"
                        >
                            Contact organizers
                        </a>
                        <a
                            href="mailto:knnymrls@outlook.com,wkoverfield@gmail.com?subject=MKRS%20Mixer%20-%20Sponsorship%20Inquiry"
                            className="bg-surface text-primary px-3.5 py-2.5 rounded-xl text-sm font-medium leading-[1.33] border-2 border-border hover:border-primary transition-colors text-center"
                        >
                            Sponsor event
                        </a>
                    </div>
                </div>
            </div>

            {/* RSVP Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setIsModalOpen(false)}>
                    <div className="bg-surface rounded-xl md:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                            <h2 className="text-lg md:text-2xl font-bold text-onsurface-primary">RSVP for mkrs. mixer</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-onsurface-secondary hover:text-onsurface-primary transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="h-[500px] md:h-[600px]">
                            <iframe
                                src="https://joinfindu.notion.site/ebd/29961be0720380da9367c189939d675f"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
