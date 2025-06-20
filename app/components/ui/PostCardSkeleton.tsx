import React from 'react';

interface PostCardSkeletonProps {
  variant?: 'short' | 'medium' | 'long';
  count?: number;
  withImage?: boolean;
}

const PostCardSkeleton = React.memo(function PostCardSkeleton({ 
  variant = 'medium', 
  count = 1,
  withImage
}: PostCardSkeletonProps) {
  const getContentLines = () => {
    switch (variant) {
      case 'short':
        return (
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-full"></div>
            <div className="h-4 bg-border rounded w-3/5"></div>
          </div>
        );
      case 'long':
        return (
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-full"></div>
            <div className="h-4 bg-border rounded w-4/5"></div>
            <div className="h-4 bg-border rounded w-full"></div>
            <div className="h-4 bg-border rounded w-2/3"></div>
            <div className="h-4 bg-border rounded w-4/5"></div>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-full"></div>
            <div className="h-4 bg-border rounded w-4/5"></div>
            <div className="h-4 bg-border rounded w-3/5"></div>
          </div>
        );
    }
  };

  const shouldShowImage = withImage ?? Math.random() > 0.6;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-surface-container rounded-2xl border-[1px] border-border hover:scale-105 transition-all duration-200 overflow-hidden break-inside-avoid mb-4 animate-pulse"
        >
          <div className="p-4 flex flex-col gap-3">
            {/* Header section */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex w-full items-center justify-between">
                {/* Avatar skeleton */}
                <div className="w-9 h-9 bg-border rounded-full flex-shrink-0"></div>
                {/* Date skeleton */}
                <div className="w-16 h-4 bg-border rounded"></div>
              </div>

              <div className="flex flex-col gap-1 w-full">
                {/* Author name skeleton */}
                <div className="w-24 h-4 bg-border rounded"></div>
                
                {/* Post content skeleton */}
                <div className="leading-relaxed">
                  {getContentLines()}
                </div>
              </div>
            </div>

            {/* Optional image skeleton */}
            {shouldShowImage && (
              <div className="w-full h-48 bg-border rounded-lg"></div>
            )}

            {/* Action buttons skeleton */}
            <div className="flex items-end gap-2">
              {/* Comment input skeleton */}
              <div className="flex-1 h-10 bg-border rounded-lg"></div>
              {/* Like button skeleton */}
              <div className="w-10 h-10 bg-border rounded-lg"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
});

export default PostCardSkeleton;