'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Project, Contribution } from '../../../models/Project';
import { Profile } from '../../../models/Profile';
import { updateProjectEmbedding } from '@/lib/embeddings/index';
import IconPicker from '@/app/components/ui/IconPicker';
import * as LucideIcons from 'lucide-react';

interface ProjectWithDetails extends Project {
    creator?: Profile;
    contributors: Array<{
        contribution: Contribution;
        profile: Profile;
    }>;
    posts: Array<{
        id: string;
        content: string;
        created_at: string;
        author: Profile;
    }>;
}

export default function ProjectPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProject, setEditedProject] = useState<Partial<Project>>({});
    const [showAddContributor, setShowAddContributor] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDescription, setSelectedDescription] = useState('');

    useEffect(() => {
        if (projectId) {
            fetchProject();
        }
    }, [projectId]);

    const fetchProject = async () => {
        try {
            // Fetch project details
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError) throw projectError;

            // Fetch creator profile
            const { data: creatorData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', projectData.created_by)
                .single();

            // Fetch contributors
            const { data: contributionsData, error: contributionsError } = await supabase
                .from('contributions')
                .select(`
                    *,
                    profiles:person_id (*)
                `)
                .eq('project_id', projectId);

            if (contributionsError) throw contributionsError;

            // Fetch related posts
            const { data: postLinksData } = await supabase
                .from('post_projects')
                .select(`
                    posts (
                        id,
                        content,
                        created_at,
                        author_id
                    )
                `)
                .eq('project_id', projectId);

            // Fetch post authors
            const posts = await Promise.all(
                (postLinksData || []).map(async (link: any) => {
                    const { data: authorData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', link.posts.author_id)
                        .single();

                    return {
                        ...link.posts,
                        author: authorData
                    };
                })
            );

            setProject({
                ...projectData,
                creator: creatorData,
                contributors: contributionsData?.map(contrib => ({
                    contribution: {
                        id: contrib.id,
                        person_id: contrib.person_id,
                        project_id: contrib.project_id,
                        role: contrib.role,
                        start_date: contrib.start_date,
                        end_date: contrib.end_date,
                        description: contrib.description,
                        created_at: contrib.created_at
                    },
                    profile: contrib.profiles
                })) || [],
                posts
            });

            setEditedProject(projectData);
        } catch (error) {
            console.error('Error fetching project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProject = async () => {
        if (!project) return;

        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    title: editedProject.title,
                    description: editedProject.description,
                    status: editedProject.status,
                    icon: editedProject.icon,
                    updated_at: new Date().toISOString()
                })
                .eq('id', projectId);

            if (error) throw error;

            // Update embeddings
            await updateProjectEmbedding(projectId);

            // Refresh project data
            await fetchProject();
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Failed to update project');
        }
    };

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
                .limit(10);

            if (error) throw error;

            // Filter out existing contributors
            const filteredResults = (data || []).filter(
                profile => !project?.contributors.some(c => c.profile.id === profile.id)
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching profiles:', error);
        }
    };

    const handleAddContributor = async (profileId: string) => {
        if (!selectedRole.trim()) {
            alert('Please enter a role for the contributor');
            return;
        }

        try {
            const { error } = await supabase
                .from('contributions')
                .insert({
                    person_id: profileId,
                    project_id: projectId,
                    role: selectedRole,
                    description: selectedDescription,
                    start_date: new Date().toISOString()
                });

            if (error) throw error;

            // Refresh project data
            await fetchProject();

            // Reset form
            setShowAddContributor(false);
            setSearchTerm('');
            setSearchResults([]);
            setSelectedRole('');
            setSelectedDescription('');
        } catch (error) {
            console.error('Error adding contributor:', error);
            alert('Failed to add contributor');
        }
    };

    const handleRemoveContributor = async (contributionId: string) => {
        if (!confirm('Are you sure you want to remove this contributor?')) return;

        try {
            const { error } = await supabase
                .from('contributions')
                .delete()
                .eq('id', contributionId);

            if (error) throw error;

            // Refresh project data
            await fetchProject();
        } catch (error) {
            console.error('Error removing contributor:', error);
            alert('Failed to remove contributor');
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;

        if (!confirm(`Are you sure you want to delete "${project.title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete all contributions first (due to foreign key constraints)
            const { error: contributionsError } = await supabase
                .from('contributions')
                .delete()
                .eq('project_id', projectId);

            if (contributionsError) throw contributionsError;

            // Delete all post_projects links
            const { error: postLinksError } = await supabase
                .from('post_projects')
                .delete()
                .eq('project_id', projectId);

            if (postLinksError) throw postLinksError;

            // Finally delete the project
            const { error: projectError } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (projectError) throw projectError;

            // Redirect to projects list
            router.push('/projects');
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project. Please try again.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-success/10 text-success border border-success/20';
            case 'paused':
                return 'bg-warning/10 text-warning border border-warning/20';
            case 'complete':
                return 'bg-surface-container-muted text-onsurface-secondary border border-border';
            default:
                return 'bg-surface-container-muted text-onsurface-secondary border border-border';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="text-5xl mb-3">🚀</div>
                    <p className="text-sm text-onsurface-secondary font-medium">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="text-5xl mb-3">❌</div>
                    <p className="text-sm text-onsurface-secondary font-medium">Project not found</p>
                </div>
            </div>
        );
    }

    const isCreator = user?.id === project.created_by;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
                <button
                    onClick={() => router.push('/projects')}
                    className="mb-6 text-sm text-onsurface-secondary hover:text-onsurface-primary transition-colors flex items-center gap-2"
                >
                    ← Back to Projects
                </button>

                {/* Project Header */}
                <div className="bg-surface-container rounded-xl border border-border p-6 mb-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={editedProject.title || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-surface-container-muted text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Project title"
                            />
                            <textarea
                                value={editedProject.description || ''}
                                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-surface-container-muted text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                rows={4}
                                placeholder="Project description"
                            />
                            <div className="flex items-center gap-4">
                                <select
                                    value={editedProject.status || 'active'}
                                    onChange={(e) => setEditedProject({ ...editedProject, status: e.target.value as Project['status'] })}
                                    className="px-4 py-2.5 border border-border rounded-xl bg-surface-container-muted text-onsurface-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="complete">Complete</option>
                                </select>
                                <div>
                                    <label className="block text-sm font-medium text-onsurface-primary mb-1">Project Icon</label>
                                    <IconPicker
                                        value={editedProject.icon || 'Folder'}
                                        onChange={(icon) => setEditedProject({ ...editedProject, icon })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUpdateProject}
                                    className="px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all shadow-sm"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditedProject(project);
                                    }}
                                    className="px-4 py-2.5 text-sm font-medium text-onsurface-primary bg-surface-container-muted rounded-xl hover:bg-surface-container border border-border transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {project.icon && (() => {
                                        const IconComponent = (LucideIcons as any)[project.icon];
                                        return IconComponent ? (
                                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <IconComponent className="w-7 h-7 text-primary" />
                                            </div>
                                        ) : null;
                                    })()}
                                    <h1 className="text-2xl font-bold text-onsurface-primary">{project.title}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusColor(project.status)}`}>
                                        {project.status}
                                    </span>
                                    {isCreator && (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-3 py-1.5 text-sm font-medium text-onsurface-primary bg-surface-container-muted rounded-xl hover:bg-surface-container border border-border transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={handleDeleteProject}
                                                className="px-3 py-1.5 text-sm font-medium text-error bg-error/10 rounded-xl hover:bg-error/20 border border-error/20 transition-all"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {project.description && (
                                <p className="text-onsurface-secondary mb-4">{project.description}</p>
                            )}

                            <div className="text-sm text-onsurface-secondary">
                                Created by {project.creator?.name || 'Unknown'} on {new Date(project.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Contributors Section */}
                <div className="bg-surface-container rounded-xl border border-border p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-onsurface-primary">Contributors</h2>
                        {isCreator && (
                            <button
                                onClick={() => setShowAddContributor(!showAddContributor)}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all shadow-sm"
                            >
                                Add Contributor
                            </button>
                        )}
                    </div>

                    {showAddContributor && (
                        <div className="mb-4 p-4 border border-border rounded-xl bg-surface-container-muted">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    searchProfiles(e.target.value);
                                }}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-surface-container text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-2"
                                placeholder="Search for contributors by name or email..."
                            />

                            <input
                                type="text"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-surface-container text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-2"
                                placeholder="Role (e.g., Developer, Designer, PM)"
                            />

                            <textarea
                                value={selectedDescription}
                                onChange={(e) => setSelectedDescription(e.target.value)}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-surface-container text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-2"
                                rows={2}
                                placeholder="Description (optional)"
                            />

                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    {searchResults.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="flex justify-between items-center p-3 border border-border rounded-xl hover:bg-surface-container transition-all"
                                        >
                                            <div>
                                                <p className="font-medium text-onsurface-primary">{profile.name}</p>
                                                <p className="text-sm text-onsurface-secondary">{profile.email}</p>
                                            </div>
                                            <button
                                                onClick={() => handleAddContributor(profile.id)}
                                                className="px-4 py-2 text-sm font-medium bg-success text-onsuccess rounded-xl hover:bg-success/90 transition-all"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        {project.contributors.map((contrib) => (
                            <div
                                key={contrib.contribution.id}
                                className="flex justify-between items-center p-4 border border-border rounded-xl hover:bg-surface-container-muted transition-all"
                            >
                                <div>
                                    <p className="font-medium text-onsurface-primary">
                                        {contrib.profile.name}
                                    </p>
                                    <p className="text-sm text-onsurface-secondary">
                                        {contrib.contribution.role}
                                    </p>
                                    {contrib.contribution.description && (
                                        <p className="text-sm text-onsurface-secondary mt-1">
                                            {contrib.contribution.description}
                                        </p>
                                    )}
                                </div>
                                {isCreator && contrib.profile.id !== project.created_by && (
                                    <button
                                        onClick={() => handleRemoveContributor(contrib.contribution.id)}
                                        className="px-3 py-1.5 text-sm font-medium text-error hover:bg-error/10 rounded-xl border border-error/20 transition-all"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Related Posts Section */}
                {project.posts.length > 0 && (
                    <div className="bg-surface-container rounded-xl border border-border p-6">
                        <h2 className="text-xl font-semibold text-onsurface-primary mb-4">Related Posts</h2>
                        <div className="space-y-4">
                            {project.posts.map((post) => (
                                <div key={post.id} className="border-b border-border/50 pb-4 last:border-0">
                                    <p className="text-onsurface-primary mb-2 leading-relaxed">{post.content}</p>
                                    <p className="text-sm text-onsurface-secondary">
                                        By {post.author?.name || 'Unknown'} on {new Date(post.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}