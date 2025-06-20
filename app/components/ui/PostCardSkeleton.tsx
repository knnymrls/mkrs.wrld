import React from 'react';

interface PostCardSkeletonProps {
  variant?: 'short' | 'medium' | 'long';
}

const PostCardSkeleton = React.memo(function PostCardSkeleton({ variant = 'medium' }: PostCardSkeletonProps) {
  const getContentLines = () => {
    switch (variant) {
      case 'short':
        return (
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
          </div>
        );
      case 'long':
        return (
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
          </div>
        );
      default:
        return (
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
          </div>
        );
    }
  };

  return (
    <div className="bg-card-bg rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer break-inside-avoid mb-4 animate-pulse">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          {/* Avatar skeleton */}
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
          {/* View Profile button skeleton */}
          <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        <div className="flex items-center justify-between mb-2">
          {/* Name skeleton */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          {/* Date skeleton */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>

        {/* Content skeleton */}
        {getContentLines()}

        {/* Comment input skeleton */}
        <div className="mt-3 flex items-center gap-2 pt-3">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
});

export default PostCardSkeleton;