'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import { Profile } from '@/app/models/Profile';

export default function NewProject() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'active' as 'active' | 'paused' | 'complete',
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Project</h1>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Project Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="e.g. Customer Analytics Dashboard"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="Describe the project goals, scope, and any relevant details..."
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Status
                            </label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'complete' })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="complete">Complete</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                    placeholder="Search for contributors by name or email..."
                                />
                                
                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm max-h-48 overflow-y-auto">
                                        {searchResults.map((profile) => (
                                            <button
                                                key={profile.id}
                                                type="button"
                                                onClick={() => handleAddContributor(profile)}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{profile.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                                                </div>
                                                <span className="text-sm text-indigo-600 dark:text-indigo-400">Add</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedContributors.length > 0 && (
                                <div className="space-y-3">
                                    {selectedContributors.map((contributor) => (
                                        <div key={contributor.profile.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{contributor.profile.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{contributor.profile.email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveContributor(contributor.profile.id)}
                                                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={contributor.role}
                                                onChange={(e) => handleContributorRoleChange(contributor.profile.id, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white sm:text-sm mb-2"
                                                placeholder="Role (e.g., Developer, Designer, PM) *"
                                                required
                                            />
                                            <textarea
                                                value={contributor.description}
                                                onChange={(e) => handleContributorDescriptionChange(contributor.profile.id, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white sm:text-sm"
                                                rows={2}
                                                placeholder="Description (optional)"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.push('/projects')}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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