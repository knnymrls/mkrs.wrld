'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { signIn } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await signIn(email, password);
            // AuthHandler and middleware will handle the redirect
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="p-3 bg-white rounded-xl text-onsurface-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Earth-1--Streamline-Flex-Remix" height="32" width="32">
                            <desc>Earth 1 Streamline Icon: https://streamlinehq.com</desc>
                            <g id="earth-1--planet-earth-globe-world">
                                <path id="Union" fill="currentColor" fillRule="evenodd" d="M14.261982857142856 2.3047028571428574c0.07179428571428571 0.6572228571428571 0.10616571428571428 1.3409828571428573 0.05595428571428571 2.003091428571428 -0.08259428571428572 1.0887942857142856 -0.3978342857142857 2.16948 -1.202622857142857 2.9742514285714283 -0.62736 0.62736 -1.4782457142857142 0.9798171428571427 -2.3654571428571427 0.9798171428571427 -0.6598971428571428 0 -1.29276 0.2621314285714285 -1.7593885714285715 0.728742857142857 -0.4666114285714285 0.4666285714285714 -0.72876 1.0994914285714286 -0.72876 1.7593885714285715v2.5000285714285715c0 0.8872285714285713 -0.35244 1.7381142857142857 -0.9798 2.365474285714286 -1.0711371428571428 1.07112 -2.61456 1.6137599999999999 -4.178708571428571 1.424862857142857 0.4063885714285714 0.8938114285714286 0.9338914285714285 1.6558114285714285 1.5672685714285715 2.28924C6.273291428571428 20.93228571428571 8.700068571428572 21.857142857142858 12 21.857142857142858c2.6226342857142857 0 4.693765714285714 -0.5840571428571428 6.2381142857142855 -1.6285714285714283v-1.1453142857142857c0 -0.43885714285714283 -0.17434285714285713 -0.8597142857142855 -0.48479999999999995 -1.17 -0.3102857142857143 -0.3104571428571429 -0.7311599999999999 -0.48479999999999995 -1.1700342857142856 -0.48479999999999995 -0.8872285714285713 0 -1.7381142857142857 -0.35237142857142856 -2.365474285714286 -0.9797314285714285 -0.62736 -0.62736 -0.9798 -1.4782457142857142 -0.9798 -2.365474285714286 0 -0.8872114285714285 0.35244 -1.7380971428571428 0.9798 -2.3654571428571427 0.4925828571428571 -0.4926 1.1831314285714285 -0.8021999999999999 1.9316399999999998 -0.9862971428571428 0.7530171428571428 -0.18521142857142855 1.5985542857142856 -0.2518457142857143 2.43924 -0.23304 1.1288571428571428 0.025234285714285713 2.2856571428571426 0.20578285714285713 3.237942857142857 0.48665142857142857 -0.17211428571428572 -2.787702857142857 -1.0633714285714284 -4.880828571428571 -2.497028571428571 -6.314639999999999 -1.2114857142857143 -1.2114171428571427 -2.8935942857142853 -2.035525714285714 -5.067617142857142 -2.3657657142857142Zm-11.106737142857142 0.850542857142857C5.268137142857142 1.0423542857142858 8.305645714285715 0 12 0s6.73182857142857 1.0423542857142858 8.844685714285713 3.155245714285714C22.95771428571428 5.268137142857142 24 8.305645714285715 24 12s-1.0422857142857143 6.73182857142857 -3.1553142857142857 8.844685714285713C18.73182857142857 22.95771428571428 15.694354285714285 24 12 24c-3.6943542857142857 0 -6.731862857142857 -1.0422857142857143 -8.844754285714286 -3.1553142857142857C1.0423542857142858 18.73182857142857 0 15.694354285714285 0 12c0 -3.6943542857142857 1.0423542857142858 -6.731862857142857 3.155245714285714 -8.844754285714286Z" clipRule="evenodd" strokeWidth="1.7143"></path>
                            </g>
                        </svg>
                    </div>
                </div>

                <div className="bg-surface-container rounded-2xl border border-border p-8 space-y-8">
                    <div>
                        <h2 className="text-center text-2xl font-semibold text-onsurface-primary">
                            Welcome back
                        </h2>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4">
                                <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-medium text-onsurface-primary mb-1">
                                    Email
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg placeholder-onsurface-secondary text-onsurface-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-onsurface-primary mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none relative block w-full px-4 py-3 border border-border rounded-lg placeholder-onsurface-secondary text-onsurface-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-onsurface-secondary">
                    Don't have an account?{' '}
                    <Link
                        href="/auth/signup"
                        className="font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
} 