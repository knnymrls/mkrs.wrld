'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  description?: string | null;
  status: 'active' | 'paused' | 'complete';
  created_at: string;
  created_by: string;
  contributors?: Array<{
    person: {
      id: string;
      name: string;
      avatar_url?: string | null;
    };
  }>;
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  const getStatusBadge = (status: Project['status']) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-800' },
      complete: { label: 'Complete', className: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div
      className="bg-surface-container rounded-2xl border-[1px] border-border hover:scale-105 transition-all duration-200 overflow-hidden group cursor-pointer break-inside-avoid mb-4"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <h3 className="font-medium text-onsurface-primary line-clamp-2">
              {project.title}
            </h3>
            {getStatusBadge(project.status)}
          </div>
          <span className="text-sm text-onsurface-secondary flex-shrink-0">
            {new Date(project.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-onsurface-primary leading-relaxed line-clamp-3">
            {project.description}
          </p>
        )}

        {project.contributors && project.contributors.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {project.contributors.slice(0, 3).map((contributor) => (
                <div
                  key={contributor.person.id}
                  className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden border-2 border-surface-container"
                >
                  {contributor.person.avatar_url ? (
                    <img
                      src={contributor.person.avatar_url}
                      alt={contributor.person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-xs font-medium">
                      {contributor.person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {project.contributors.length > 3 && (
              <span className="text-xs text-onsurface-secondary ml-2">
                +{project.contributors.length - 3} more
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}