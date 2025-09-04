'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Contribution } from '../../models/Project';
import { Profile } from '../../models/Profile';
import ProjectIcon from '@/app/components/ui/ProjectIcon';

interface ProjectWithContributors extends Project {
    contributors: Array<{
        contribution: Contribution;
        profile: Profile;
    }>;
}

interface ProjectsListProps {
    initialProjects: ProjectWithContributors[];
}

export default function ProjectsList({ initialProjects }: ProjectsListProps) {
    const router = useRouter();
    const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'complete'>('all');

    const filteredProjects = initialProjects.filter(project => 
        filter === 'all' || project.status === filter
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/10 text-green-600 dark:text-green-400';
            case 'paused':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
            case 'complete':
                return 'bg-surface-container-muted text-onsurface-secondary';
            default:
                return 'bg-surface-container-muted text-onsurface-secondary';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="px-4 sm:px-6 lg:px-9 py-6 sm:py-8 lg:py-12 mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Projects</h1>
                    <button
                        onClick={() => router.push('/projects/new')}
                        className="px-4 py-2 text-sm font-medium text-white dark:text-background bg-primary hover:bg-primary-hover rounded-lg transition-colors"
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
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    filter === status
                                        ? 'bg-primary text-white dark:text-background'
                                        : 'bg-surface-container text-onsurface-primary hover:bg-surface-container-muted'
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
                            className="bg-surface-container rounded-2xl border border-border p-6 hover:border-primary/20 transition-all cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        <ProjectIcon icon={project.icon} variant="graph" size={20} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {project.title}
                                    </h3>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            
                            {project.description && (
                                <p className="text-sm text-onsurface-secondary mb-4 line-clamp-3">
                                    {project.description}
                                </p>
                            )}

                            <div className="border-t border-border pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {project.contributors.slice(0, 3).map((contrib, index) => (
                                            <div
                                                key={contrib.contribution.id}
                                                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white dark:text-background text-xs font-medium ring-2 ring-background"
                                                title={contrib.profile.name || ''}
                                            >
                                                {contrib.profile.name?.charAt(0) || '?'}
                                            </div>
                                        ))}
                                        {project.contributors.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-surface-container-muted flex items-center justify-center text-onsurface-secondary text-xs font-medium ring-2 ring-background">
                                                +{project.contributors.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-onsurface-secondary">
                                        {project.contributors.length} contributor{project.contributors.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-onsurface-secondary">
                            No {filter !== 'all' ? filter : ''} projects found.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}