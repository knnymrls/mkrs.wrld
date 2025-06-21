'use client';

import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Navbar() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showDropdown, setShowDropdown] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleSignOut = async () => {
        try {
            await signOut();
            setShowDropdown(false);
            router.push('/');
        } catch (err) {
            console.error('Error signing out:', err);
        }
    };

    // Fetch user profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url, name')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setUserAvatar(data.avatar_url);
                    setUserName(data.name);
                }
            }
        };

        fetchUserProfile();
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        {
            name: 'Home',
            href: '/',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            name: 'Chat',
            href: '/chatbot',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            )
        },
        {
            name: 'Graph',
            href: '/graph',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            )
        },
        {
            name: 'Projects',
            href: '/projects',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            )
        },
        {
            name: 'Notifications',
            href: '/notifications',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            )
        },
    ];

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="hidden md:flex fixed left-0 top-0 h-full w-16 bg-background border-r border-border flex-col justify-between items-center py-4">
            {/* Logo */}
            <Link href="/">
                <img
                    src="/nelnet-logo.png"
                    alt="Nelnet Logo"
                    className="w-10 h-10 object-contain"
                />
            </Link>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        title={item.name}
                        className={`p-3 rounded-lg transition-colors ${isActive(item.href)
                            ? 'bg-primary/10 text-primary'
                            : 'text-onsurface-secondary hover:bg-surface-container-muted hover:text-onsurface-primary'
                            }`}
                    >
                        {item.icon}
                    </Link>
                ))}
            </nav>

            {/* User Section */}
            <div className="relative" ref={dropdownRef}>
                {user ? (
                    <>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            title="Profile"
                            className="p-3 rounded-lg text-onsurface-secondary hover:bg-surface-container-muted hover:text-onsurface-primary transition-colors"
                        >
                            {userAvatar ? (
                                <img
                                    src={userAvatar}
                                    alt="Profile"
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            ) : userName ? (
                                <div className="w-6 h-6 rounded-full bg-avatar-bg flex items-center justify-center text-xs font-medium text-onsurface-secondary">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="absolute overflow-clip bottom-0 left-full ml-2 w-48 bg-surface-container rounded-lg shadow-sm border border-border">
                                <Link
                                    href="/profile"
                                    onClick={() => setShowDropdown(false)}
                                    className="block px-4 py-2 text-sm text-onsurface-primary hover:bg-surface-container-muted hover:text-onsurface-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        View Profile
                                    </div>
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="block w-full text-left px-4 py-2 text-sm text-onsurface-primary hover:bg-surface-container-muted hover:text-onsurface-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign out
                                    </div>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <Link
                        href="/auth/signin"
                        title="Sign in"
                        className="p-3 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </Link>
                )}
            </div>
        </div>
    );
}