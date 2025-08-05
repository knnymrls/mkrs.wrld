'use client';

import React from 'react';
import Link from 'next/link';
import { ProjectRequest, TIME_COMMITMENT_LABELS, URGENCY_LABELS } from '@/app/models/ProjectRequest';
import { Clock, Users, AlertCircle, Building2, Hash } from 'lucide-react';

interface ProjectRequestCardProps {
  request: ProjectRequest;
  onInterestClick?: () => void;
}

export default function ProjectRequestCard({ request, onInterestClick }: ProjectRequestCardProps) {
  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-surface-container rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Link href={`/project-requests/${request.id}`} className="block">
            <h3 className="text-lg font-semibold text-onsurface-primary hover:text-primary transition-colors">
              {request.title}
            </h3>
          </Link>
          {request.creator && (
            <p className="text-sm text-onsurface-secondary mt-1">
              Posted by <Link href={`/profile/${request.creator.id}`} className="text-primary hover:underline">
                {request.creator.name}
              </Link>
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgencyColors[request.urgency]}`}>
          {request.urgency.toUpperCase()}
        </span>
      </div>

      <p className="text-onsurface-primary mb-4 line-clamp-3">{request.description}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {request.skills_needed.map((skill, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-sm text-onsurface-secondary mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{TIME_COMMITMENT_LABELS[request.time_commitment]}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{request.max_participants} spot{request.max_participants !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-onsurface-secondary">
          {request.interest_count ? (
            <span>{request.interest_count} interested</span>
          ) : (
            <span>Be the first to show interest!</span>
          )}
        </div>
        {onInterestClick && request.status === 'open' && (
          <button
            onClick={onInterestClick}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              request.is_interested
                ? 'bg-surface-container-muted text-onsurface-primary hover:bg-surface-container-muted/80'
                : 'bg-primary text-onprimary hover:bg-primary/90'
            }`}
          >
            {request.is_interested ? 'Interested ✓' : 'Show Interest'}
          </button>
        )}
      </div>
    </div>
  );
}