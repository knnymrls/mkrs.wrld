'use client';

import React from 'react';
import NotificationDropdown from '@/app/components/features/NotificationDropdown';

interface ActivityFeedHeaderProps {
  userId: string | null;
  onCreatePost: () => void;
  onPostClick: (postId: string) => void;
}

/**
 * Header component for the activity feed page
 * Contains title, notifications, and create post button
 */
export default function ActivityFeedHeader({ userId, onCreatePost, onPostClick }: ActivityFeedHeaderProps) {
  return (
    <div className="flex flex-col gap-4 justify-between items-start mb-4 w-full sm:flex-row sm:items-center">
      <h1 className="text-2xl font-medium text-onsurface-primary">Activity Feed</h1>

      <div className="flex gap-3 items-center">
        {/* Notification Button */}
        {userId && (
          <NotificationDropdown
            userId={userId}
            onPostClick={onPostClick}
          />
        )}

        {/* New Post Button */}
        <button
          onClick={onCreatePost}
          className="px-4 py-2 hover:bg-primary-hover text-primary hover:text-surface-container-muted border-primary-hover border-[1px] rounded-full bg-surface-container transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create</span>
        </button>
      </div>
    </div>
  );
}