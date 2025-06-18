'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface MentionLinkProps {
  id: string;
  name: string;
  type: 'person' | 'project';
  imageUrl?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function MentionLink({ id, name, type, imageUrl, className = '', onClick }: MentionLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else {
      // Only navigate if no custom onClick is provided
      router.push(type === 'person' ? `/profile/${id}` : `/projects/${id}`);
    }
  };

  return (
    <a
      href={type === 'person' ? `/profile/${id}` : `/projects/${id}`}
      className={`inline-flex items-center gap-0.5 text-text-primary ${className}`}
      onClick={handleClick}
      style={{ verticalAlign: 'middle' }}
    >
      {/* Icon - shows image if available, otherwise default icon */}
      {type === 'person' ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-4 h-4 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-medium text-gray-600 flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
        )
      ) : (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-4 h-4 rounded object-cover flex-shrink-0"
          />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
          </svg>
        )
      )}
      <span className="underline hover:underline hover:decoration-text-primary decoration-gray-300 underline-offset-3">{name}</span>
    </a>
  );
}