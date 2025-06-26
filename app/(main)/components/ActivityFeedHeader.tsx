'use client';

import React, { useState } from 'react';
import NotificationDropdown from '@/app/components/features/NotificationDropdown';
import FeedbackModal from '@/app/components/features/FeedbackModal';

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
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
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

          {/* Feedback Button */}
          <button
            onClick={() => setShowFeedback(true)}
            className="p-2 hover:bg-surface-container-muted rounded-lg transition-colors"
            title="Send Feedback (⌘⇧F)"
          >
            <svg className="w-5 h-5 text-onsurface-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>

          {/* New Post Button */}
          <button
            onClick={onCreatePost}
            data-create-post-trigger
            className="px-4 py-2 hover:bg-primary-hover text-primary hover:text-surface-container-muted border-primary-hover border-[1px] rounded-full bg-surface-container transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </>
  );
}