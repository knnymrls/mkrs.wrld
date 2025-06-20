'use client';

import React from 'react';

interface ProfileSkeletonProps {
  count?: number;
  variant?: 'card' | 'full' | 'compact';
}

const ProfileSkeleton = React.memo(function ProfileSkeleton({ 
  count = 1, 
  variant = 'card' 
}: ProfileSkeletonProps) {
  const renderCardSkeleton = () => (
    <div className="bg-surface-container rounded-2xl border-[1px] border-border p-4 animate-pulse">
      {/* Avatar and header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-border rounded-full flex-shrink-0"></div>
        <div className="flex-1">
          <div className="w-32 h-4 bg-border rounded mb-1"></div>
          <div className="w-24 h-3 bg-border rounded"></div>
        </div>
      </div>
      
      {/* Bio */}
      <div className="space-y-2 mb-3">
        <div className="w-full h-3 bg-border rounded"></div>
        <div className="w-3/4 h-3 bg-border rounded"></div>
      </div>
      
      {/* Skills */}
      <div className="flex flex-wrap gap-1">
        <div className="w-16 h-6 bg-border rounded-full"></div>
        <div className="w-20 h-6 bg-border rounded-full"></div>
        <div className="w-14 h-6 bg-border rounded-full"></div>
      </div>
    </div>
  );

  const renderFullSkeleton = () => (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-24 h-24 bg-border rounded-full flex-shrink-0"></div>
        <div className="flex-1">
          <div className="w-48 h-6 bg-border rounded mb-2"></div>
          <div className="w-32 h-4 bg-border rounded mb-1"></div>
          <div className="w-28 h-4 bg-border rounded"></div>
        </div>
      </div>
      
      {/* Bio section */}
      <div className="mb-6">
        <div className="w-16 h-5 bg-border rounded mb-3"></div>
        <div className="space-y-2">
          <div className="w-full h-4 bg-border rounded"></div>
          <div className="w-5/6 h-4 bg-border rounded"></div>
          <div className="w-3/4 h-4 bg-border rounded"></div>
        </div>
      </div>
      
      {/* Skills section */}
      <div className="mb-6">
        <div className="w-12 h-5 bg-border rounded mb-3"></div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-20 h-8 bg-border rounded-full"></div>
          ))}
        </div>
      </div>
      
      {/* Experience/Education sections */}
      <div className="space-y-6">
        <div>
          <div className="w-24 h-5 bg-border rounded mb-3"></div>
          <div className="space-y-3">
            <div className="w-full h-16 bg-border rounded"></div>
            <div className="w-full h-16 bg-border rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompactSkeleton = () => (
    <div className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
      <div className="w-10 h-10 bg-border rounded-full flex-shrink-0"></div>
      <div className="flex-1">
        <div className="w-28 h-4 bg-border rounded mb-1"></div>
        <div className="w-20 h-3 bg-border rounded"></div>
      </div>
    </div>
  );

  const getSkeleton = () => {
    switch (variant) {
      case 'full':
        return renderFullSkeleton();
      case 'compact':
        return renderCompactSkeleton();
      default:
        return renderCardSkeleton();
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={variant === 'card' ? 'mb-4' : ''}>
          {getSkeleton()}
        </div>
      ))}
    </>
  );
});

export default ProfileSkeleton;