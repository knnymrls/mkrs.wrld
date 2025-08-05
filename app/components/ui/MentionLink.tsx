'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';

interface MentionLinkProps {
  id: string;
  name: string;
  type: 'person' | 'project';
  imageUrl?: string | null;
  icon?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function MentionLink({ id, name, type, imageUrl, icon, className = '', onClick }: MentionLinkProps) {
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
      className={`mention-link text-onsurface-primary hover:bg-surface-container-muted rounded px-1 py-0.5 -my-0.5 transition-colors ${className}`}
      onClick={handleClick}
      data-mention-type={type}
      data-mention-id={id}
      data-mention-name={name}
    >
      {/* Icon - shows image if available, otherwise default icon */}
      {type === 'person' ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="inline w-4 h-4 rounded-full object-cover align-middle"
          />
        ) : (
          <span className="inline-block w-4 h-4 rounded-full bg-surface-container text-[10px] font-medium text-onsurface-secondary align-middle text-center leading-4">
            {name.charAt(0).toUpperCase()}
          </span>
        )
      ) : (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="inline w-4 h-4 rounded object-cover align-middle"
          />
        ) : icon && (LucideIcons as any)[icon] ? (
          (() => {
            const IconComponent = (LucideIcons as any)[icon];
            return <IconComponent className="inline w-4 h-4 text-onsurface-secondary align-middle" />;
          })()
        ) : (
          <svg className="inline w-4 h-4 text-onsurface-secondary align-middle" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
          </svg>
        )
      )}
      {' '}
      <span className="text-base underline underline-offset-2 decoration-onsurface-primary/30 ">{name}</span>
    </a>
  );
}