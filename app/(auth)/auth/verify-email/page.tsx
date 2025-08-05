'use client';

import Link from 'next/link';

export default function VerifyEmail() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-surface-container rounded-2xl border border-border p-8 text-center space-y-6">
                    <div className="space-y-4">
                        {/* Email Icon */}
                        <div className="flex justify-center">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-onsurface-primary">
                                Check your email
                            </h2>
                            <p className="mt-2 text-sm text-onsurface-secondary">
                                We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            Return to sign in
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-onsurface-secondary">
                    Didn't receive the email?{' '}
                    <button className="font-medium text-primary hover:text-primary-hover transition-colors">
                        Resend verification email
                    </button>
                </p>
            </div>
        </div>
    );
} 