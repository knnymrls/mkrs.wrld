'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

interface AuthorLinkProps {
  authorId: string;
  authorName: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function AuthorLink({ authorId, authorName, className = '', onClick }: AuthorLinkProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick(e);
    router.push(authorId === user?.id ? '/profile' : `/profile/${authorId}`);
  };

  return (
    <h3
      className={`cursor-pointer w-fit hover:text-text-primary hover:underline transition-all ${className}`}
      onClick={handleClick}
      data-profile-id={authorId}
    >
      {authorName}
    </h3>
  );
}