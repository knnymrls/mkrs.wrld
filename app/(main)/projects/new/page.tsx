'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import { Profile } from '@/app/models/Profile';
import IconPicker from '@/app/components/ui/IconPicker';

export default function NewProject() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'active' as 'active' | 'paused' | 'complete',
        icon: 'Folder',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [selectedContributors, setSelectedContributors] = useState<{
        profile: Profile;
        role: string;
        description: string;
    }[]>([]);

    const searchProfiles = async (search: string) => {
        if (!search.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
                .neq('id', user?.id) // Exclude current user
                .limit(10);

            if (error) throw error;

            // Filter out already selected contributors
            const filteredResults = (data || []).filter(
                profile => !selectedContributors.some(c => c.profile.id === profile.id)
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching profiles:', error);
        }
    };

    const handleAddContributor = (profile: Profile) => {
        setSelectedContributors([...selectedContributors, {
            profile,
            role: '',
            description: ''
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleRemoveContributor = (profileId: string) => {
        setSelectedContributors(selectedContributors.filter(c => c.profile.id !== profileId));
    };

    const handleContributorRoleChange = (profileId: string, role: string) => {
        setSelectedContributors(selectedContributors.map(c => 
            c.profile.id === profileId ? { ...c, role } : c
        ));
    };

    const handleContributorDescriptionChange = (profileId: string, description: string) => {
        setSelectedContributors(selectedContributors.map(c => 
            c.profile.id === profileId ? { ...c, description } : c
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validate that all contributors have roles
        const invalidContributors = selectedContributors.filter(c => !c.role.trim());
        if (invalidContributors.length > 0) {
            alert('Please specify a role for all contributors');
            return;
        }

        setLoading(true);

        try {
            // Generate embedding from title and description
            const embeddingInput = `${formData.title} ${formData.description}`;
            const embedding = await getEmbedding(embeddingInput);

            // Create the project
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    status: formData.status,
                    icon: formData.icon,
                    created_by: user.id,
                    embedding,
                })
                .select()
                .single();

            if (projectError) throw projectError;

            // Add the creator as a contributor
            const contributionsToInsert = [
                {
                    person_id: user.id,
                    project_id: project.id,
                    role: 'Creator',
                    start_date: new Date().toISOString().split('T')[0],
                },
                ...selectedContributors.map(c => ({
                    person_id: c.profile.id,
                    project_id: project.id,
                    role: c.role,
                    description: c.description || null,
                    start_date: new Date().toISOString().split('T')[0],
                }))
            ];

            const { error: contributionError } = await supabase
                .from('contributions')
                .insert(contributionsToInsert);

            if (contributionError) throw contributionError;

            router.push(`/projects/${project.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-onsurface-primary mb-4 sm:mb-6">Create New Project</h1>
                    
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Project Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                placeholder="e.g. Customer Analytics Dashboard"
                            />
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
                                placeholder="Describe the project goals, scope, and any relevant details..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                Project Icon
                            </label>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-onsurface-primary mb-2">
                                Status
                            </label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'complete' })}
                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="complete">Complete</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                Contributors
                            </label>
                            
                            <div className="mb-3">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        searchProfiles(e.target.value);
                                    }}
                                    className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="Search for contributors by name or email..."
                                />
                                
                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-surface-container border border-border rounded-xl shadow-sm max-h-48 overflow-y-auto">
                                        {searchResults.map((profile) => (
                                            <button
                                                key={profile.id}
                                                type="button"
                                                onClick={() => handleAddContributor(profile)}
                                                className="w-full text-left px-4 py-3 min-h-[48px] hover:bg-surface-container-muted flex justify-between items-center transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium text-onsurface-primary">{profile.name}</p>
                                                    <p className="text-sm text-onsurface-secondary">{profile.email}</p>
                                                </div>
                                                <span className="text-sm text-primary">Add</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedContributors.length > 0 && (
                                <div className="space-y-3">
                                    {selectedContributors.map((contributor) => (
                                        <div key={contributor.profile.id} className="p-3 sm:p-4 bg-surface-container-muted rounded-xl">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                                <div>
                                                    <p className="font-medium text-onsurface-primary">{contributor.profile.name}</p>
                                                    <p className="text-sm text-onsurface-secondary">{contributor.profile.email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveContributor(contributor.profile.id)}
                                                    className="text-sm text-red-500 hover:text-red-600 self-start sm:self-auto"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={contributor.role}
                                                onChange={(e) => handleContributorRoleChange(contributor.profile.id, e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-2"
                                                placeholder="Role (e.g., Developer, Designer, PM) *"
                                                required
                                            />
                                            <textarea
                                                value={contributor.description}
                                                onChange={(e) => handleContributorDescriptionChange(contributor.profile.id, e.target.value)}
                                                className="w-full min-h-[80px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                                rows={2}
                                                placeholder="Description (optional)"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/projects')}
                                className="w-full sm:flex-1 min-h-[48px] py-3 px-4 border border-border rounded-xl text-base sm:text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:flex-1 min-h-[48px] py-3 px-4 border border-transparent rounded-xl shadow-sm text-base sm:text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}