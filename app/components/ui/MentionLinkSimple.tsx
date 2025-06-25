'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface MentionLinkSimpleProps {
  id: string;
  name: string;
  type: 'person' | 'project';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function MentionLinkSimple({ id, name, type, className = '', onClick }: MentionLinkSimpleProps) {
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
      className={`text-primary-hover underline decoration-1 underline-offset-3 ${className}`}
      onClick={handleClick}
      data-mention-type={type}
      data-mention-id={id}
      data-mention-name={name}
    >
      {name}
    </a>
  );
}