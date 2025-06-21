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
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-onsurface-primary mb-4 sm:mb-6">Add Education</h1>
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <div>
                            <label htmlFor="school" className="block text-sm font-medium text-onsurface-primary mb-2">
                                School/University *
                            </label>
                            <input
                                type="text"
                                id="school"
                                required
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. Stanford University"
                            />
                        </div>
                        <div>
                            <label htmlFor="degree" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Degree *
                            </label>
                            <input
                                type="text"
                                id="degree"
                                required
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. BS Computer Science"
                            />
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Graduation Year
                            </label>
                            <input
                                type="text"
                                id="year"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. 2024"
                            />
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/profile')}
                                className="w-full sm:flex-1 min-h-[48px] py-3 px-4 border border-border rounded-xl text-base sm:text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:flex-1 min-h-[48px] py-3 px-4 border border-transparent rounded-xl shadow-sm text-base sm:text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Education'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}