'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users, AlertCircle, Building2 } from 'lucide-react';
import { TIME_COMMITMENT_LABELS } from '@/app/models/ProjectRequest';

interface ProjectRequestCardGridProps {
  request: {
    id: string;
    type: 'project_request';
    created_at: string;
    title: string;
    description?: string;
    skills_needed: string[];
    time_commitment: 'few_hours' | 'few_days' | 'week' | 'few_weeks' | 'month' | 'months';
    urgency: 'low' | 'medium' | 'high';
    department?: string;
    division?: string;
    status: 'open' | 'in_review' | 'filled' | 'cancelled';
    max_participants: number;
    created_by: string;
    creator?: {
      id: string;
      name: string;
      title?: string;
      avatar_url?: string;
    };
  };
}

export default function ProjectRequestCardGrid({ request }: ProjectRequestCardGridProps) {
  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const urgencyBorders = {
    low: 'border-green-200',
    medium: 'border-yellow-200',
    high: 'border-red-200'
  };

  return (
    <div className={`bg-surface-container rounded-2xl border-[1px] ${urgencyBorders[request.urgency]} hover:scale-105 transition-all duration-200 overflow-hidden break-inside-avoid mb-4`}>
      <div className="p-4">
        {/* Header with urgency badge */}
        <div className="flex justify-between items-start mb-3">
          <Link href={`/project-requests/${request.id}`} className="flex-1">
            <h3 className="font-semibold text-onsurface-primary hover:text-primary transition-colors line-clamp-2">
              {request.title}
            </h3>
          </Link>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${urgencyColors[request.urgency]}`}>
            {request.urgency.toUpperCase()}
          </span>
        </div>

        {/* Creator info */}
        {request.creator && (
          <div className="flex items-center gap-2 mb-3">
            {request.creator.avatar_url ? (
              <img 
                src={request.creator.avatar_url} 
                alt={request.creator.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-avatar-bg flex items-center justify-center text-xs font-medium text-onsurface-secondary">
                {request.creator.name.charAt(0).toUpperCase()}
              </div>
            )}
            <Link href={`/profile/${request.creator.id}`} className="text-sm text-onsurface-secondary hover:text-primary">
              {request.creator.name}
            </Link>
          </div>
        )}

        {/* Description */}
        {request.description && (
          <p className="text-sm text-onsurface-secondary mb-3 line-clamp-3">
            {request.description}
          </p>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {request.skills_needed.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
            >
              {skill}
            </span>
          ))}
          {request.skills_needed.length > 3 && (
            <span className="px-2 py-1 bg-surface-container-muted text-onsurface-secondary rounded-full text-xs">
              +{request.skills_needed.length - 3} more
            </span>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-3 text-xs text-onsurface-secondary">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{TIME_COMMITMENT_LABELS[request.time_commitment]}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{request.max_participants} spot{request.max_participants !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Department/Division if available */}
        {(request.department || request.division) && (
          <div className="flex items-center gap-1 mt-2 text-xs text-onsurface-secondary">
            <Building2 className="w-3 h-3" />
            <span>{[request.department, request.division].filter(Boolean).join(' • ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}