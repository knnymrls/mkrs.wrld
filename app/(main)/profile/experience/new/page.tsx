'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { updateProfileEmbedding } from '@/lib/embeddings/profile-embeddings';

export default function NewExperience() {
    const { user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        company: '',
        role: '',
        start_date: '',
        end_date: '',
        description: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);

        const { error } = await supabase.from('experiences').insert({
            profile_id: user.id,
            company: formData.company,
            role: formData.role,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            description: formData.description || null,
        });

        if (error) {
            console.error('Error adding experience:', error);
            setIsSubmitting(false);
        } else {
            // Update profile embedding with new experience data
            await updateProfileEmbedding(user.id);
            router.push('/profile');
        }
    };

    return (
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-onsurface-primary mb-4 sm:mb-6">Add Experience</h1>
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <div>
                            <label htmlFor="company" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Company *
                            </label>
                            <input
                                type="text"
                                id="company"
                                required
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. Google"
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Role/Title *
                            </label>
                            <input
                                type="text"
                                id="role"
                                required
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. Software Engineer Intern"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-onsurface-primary mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="text"
                                    id="start_date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="e.g. June 2024"
                                />
                            </div>
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-onsurface-primary mb-2">
                                    End Date
                                </label>
                                <input
                                    type="text"
                                    id="end_date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="e.g. Present"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-h-[120px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                placeholder="Describe your responsibilities and achievements..."
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
                                {isSubmitting ? 'Adding...' : 'Add Experience'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}