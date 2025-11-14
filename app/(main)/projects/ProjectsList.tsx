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
                return 'bg-success/10 text-success border border-success/20';
            case 'paused':
                return 'bg-warning/10 text-warning border border-warning/20';
            case 'complete':
                return 'bg-surface-container-muted text-onsurface-secondary border border-border';
            default:
                return 'bg-surface-container-muted text-onsurface-secondary border border-border';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-surface-container/80 backdrop-blur-md border-b border-border">
                <div className="px-4 sm:px-6 lg:px-9 py-4 sm:py-6 mx-auto w-full">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl sm:text-3xl font-semibold text-onsurface-primary">Projects</h1>
                        <button
                            onClick={() => router.push('/projects/new')}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl transition-all shadow-sm"
                        >
                            Create New Project
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-9 py-6 sm:py-8 lg:py-12 mx-auto w-full">
                {/* Filter Buttons */}
                <div className="mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {(['all', 'active', 'paused', 'complete'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                                    filter === status
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-surface-container text-onsurface-primary hover:bg-surface-container-muted border border-border'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-surface-container rounded-xl border border-border p-5 sm:p-6 hover:bg-surface-container-muted hover:border-primary/30 transition-all cursor-pointer group"
                            onClick={() => router.push(`/projects/${project.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        <ProjectIcon icon={project.icon} variant="graph" size={20} />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-semibold text-onsurface-primary truncate group-hover:text-primary transition-colors">
                                        {project.title}
                                    </h3>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg flex-shrink-0 ml-2 ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            
                            {project.description && (
                                <p className="text-sm text-onsurface-secondary mb-4 line-clamp-3 leading-relaxed">
                                    {project.description}
                                </p>
                            )}

                            <div className="border-t border-border/50 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {project.contributors.slice(0, 3).map((contrib, index) => (
                                            <div
                                                key={contrib.contribution.id}
                                                className="w-8 h-8 rounded-full bg-avatar-bg flex items-center justify-center text-onsurface-primary text-xs font-medium ring-2 ring-background"
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

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="text-5xl mb-3">🚀</div>
                            <p className="text-sm text-onsurface-secondary font-medium">
                                No {filter !== 'all' ? filter : ''} projects found.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}