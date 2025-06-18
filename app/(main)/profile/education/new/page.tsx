'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { updateProfileEmbedding } from '@/lib/embeddings/profile-embeddings';

export default function NewEducation() {
    const { user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        school: '',
        degree: '',
        year: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);

        const { error } = await supabase.from('educations').insert({
            profile_id: user.id,
            school: formData.school,
            degree: formData.degree,
            year: formData.year || null,
        });

        if (error) {
            console.error('Error adding education:', error);
            setIsSubmitting(false);
        } else {
            // Update profile embedding with new education data
            await updateProfileEmbedding(user.id);
            router.push('/profile');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Education</h1>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                School/University *
                            </label>
                            <input
                                type="text"
                                id="school"
                                required
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="e.g. Stanford University"
                            />
                        </div>
                        <div>
                            <label htmlFor="degree" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Degree *
                            </label>
                            <input
                                type="text"
                                id="degree"
                                required
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="e.g. BS Computer Science"
                            />
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Graduation Year
                            </label>
                            <input
                                type="text"
                                id="year"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="e.g. 2024"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Education'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/profile')}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}