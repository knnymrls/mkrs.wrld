'use client';

import React from 'react';

interface LikeButtonProps {
  isLiked: boolean;
  onClick: () => void;
  showCount?: boolean;
  count?: number;
}

export default function LikeButton({ isLiked, onClick, showCount = false, count }: LikeButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex cursor-pointer items-center gap-1 py-1.5 rounded transition-all duration-200 ease-in-out ${isLiked ? 'text-primary' : 'text-onsurface-primary hover:text-primary-hover'
        } hover:scale-110 active:scale-95`}
    >
      <svg
        className="w-6 h-6"
        fill={isLiked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isLiked ? 0 : 1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
        />
      </svg>
      {showCount && count !== undefined && (
        <span className="text-sm">{count}</span>
      )}
    </button>
  );
}