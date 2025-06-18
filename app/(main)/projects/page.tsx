'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Project, Contribution } from '../../models/Project';
import { Profile } from '../../models/Profile';

interface ProjectWithContributors extends Project {
    contributors: Array<{
        contribution: Contribution;
        profile: Profile;
    }>;
}

export default function Projects() {
    const { user } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectWithContributors[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'complete'>('all');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            // Fetch all projects
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // Fetch contributions and profiles for each project
            const projectsWithContributors = await Promise.all(
                (projectsData || []).map(async (project) => {
                    const { data: contributionsData, error: contributionsError } = await supabase
                        .from('contributions')
                        .select(`
                            *,
                            profiles:person_id (*)
                        `)
                        .eq('project_id', project.id);

                    if (contributionsError) throw contributionsError;

                    return {
                        ...project,
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
                        })) || []
                    };
                })
            );

            setProjects(projectsWithContributors);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(project => 
        filter === 'all' || project.status === filter
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'paused':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'complete':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading projects...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
                    <button
                        onClick={() => router.push('/projects/new')}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Create New Project
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex space-x-2">
                        {(['all', 'active', 'paused', 'complete'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-md ${
                                    filter === status
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {project.title}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            
                            {project.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                                    {project.description}
                                </p>
                            )}

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {project.contributors.slice(0, 3).map((contrib, index) => (
                                            <div
                                                key={contrib.contribution.id}
                                                className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800"
                                                title={contrib.profile.name || ''}
                                            >
                                                {contrib.profile.name?.charAt(0) || '?'}
                                            </div>
                                        ))}
                                        {project.contributors.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium ring-2 ring-white dark:ring-gray-800">
                                                +{project.contributors.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {project.contributors.length} contributor{project.contributors.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">
                            No {filter !== 'all' ? filter : ''} projects found.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}