'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Profile() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<{
        full_name: string;
        bio: string;
    } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, bio')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data);
                setFormData({
                    full_name: data?.full_name || '',
                    bio: data?.bio || '',
                });
                console.log(data);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name,
                bio: formData.bio
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
        } else {
            setProfile({
                ...profile!,
                full_name: formData.full_name,
                bio: formData.bio,
            });
            setIsEditing(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Bio
                                </label>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Save Changes
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.full_name || 'Not set'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.bio || 'No bio yet'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 