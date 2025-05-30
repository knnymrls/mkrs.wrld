'use client';

import Link from 'next/link';

export default function VerifyEmail() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        Check your email
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        We sent you an email with a link to verify your account. Please check your inbox and follow the instructions.
                    </p>
                </div>
                <div className="mt-4">
                    <Link
                        href="/auth/signin"
                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Return to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
} 