'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import CreatePostModal from '../components/features/CreatePostModal';
import PostModal from '../components/features/PostModal';
import ActivityGrid, { ActivityItem } from '../components/features/ActivityGrid';
import ActivityFeedHeader from './components/ActivityFeedHeader';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useActivityFeed } from './hooks/useActivityFeed';
import { useRealtimeActivity } from './hooks/useRealtimeActivity';
import { usePostInteractions } from './hooks/usePostInteractions';

interface Post {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  mentions: Array<{ id: string; name: string; type: 'person' | 'project'; imageUrl?: string | null }>;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  images?: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    position: number;
  }>;
}

export default function Home() {
  const { user, hasProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Use custom hooks
  const {
    activities,
    loadingActivities,
    fetchActivities,
    updateActivity,
    removeActivity,
    addActivity
  } = useActivityFeed(user);

  const {
    toggleLike,
    createQuickComment,
    quickComments,
    setQuickComments,
    quickCommentMentions,
    setQuickCommentMentions,
    submittingQuickComment
  } = usePostInteractions({ user, onActivityUpdate: updateActivity });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setSelectedPost(null);
      setIsCreatingPost(false);
    },
    onCreatePost: () => setIsCreatingPost(true)
  });

  // The AuthContext already handles onboarding redirect, so we don't need it here

  // Fetch initial data
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Real-time subscriptions
  useRealtimeActivity({ user, onNewActivity: addActivity });

  // Handle post parameter from URL (for notifications)
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId && activities.length > 0) {
      const post = activities.find(a => a.id === postId && a.type === 'post') as Post;
      if (post) {
        setSelectedPost(post);
        // Clean up URL
        router.replace('/');
      }
    }
  }, [searchParams, activities, router]);

  // Event handlers
  const handlePostClick = useCallback((post: ActivityItem) => {
    if (post.type === 'post') {
      setSelectedPost(post as Post);
    }
  }, []);

  const handleOpenPostFromNotification = useCallback(async (postId: string) => {
    const post = activities.find(a => a.id === postId && a.type === 'post') as Post;
    if (post) {
      setSelectedPost(post);
    }
  }, [activities]);

  const handlePostUpdate = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  const handlePostDelete = useCallback(async (postId: string) => {
    // Close the modal if this post was selected
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
    }
    removeActivity(postId);
  }, [selectedPost, removeActivity]);

  const handleToggleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    await toggleLike(postId, currentlyLiked);
  }, [toggleLike]);

  const handleCreateQuickComment = useCallback(async (postId: string) => {
    await createQuickComment(postId);
  }, [createQuickComment]);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-9 py-12 mx-auto w-full">
        <ActivityFeedHeader
          userId={user?.id || null}
          onCreatePost={() => setIsCreatingPost(true)}
          onPostClick={handleOpenPostFromNotification}
        />

        <ActivityGrid
          items={activities}
          loading={loadingActivities}
          onPostClick={handlePostClick}
          onLikeToggle={handleToggleLike}
          onCommentSubmit={handleCreateQuickComment}
          quickComments={quickComments}
          setQuickComments={setQuickComments}
          submittingQuickComment={submittingQuickComment}
          quickCommentMentions={quickCommentMentions}
          setQuickCommentMentions={setQuickCommentMentions}
        />

        {user && isCreatingPost && (
          <CreatePostModal
            isOpen={isCreatingPost}
            onClose={() => setIsCreatingPost(false)}
            onPostCreated={() => {
              handlePostUpdate();
              setIsCreatingPost(false);
            }}
          />
        )}

        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onUpdate={(updatedPost) => {
              updateActivity(updatedPost.id, updatedPost);
              setSelectedPost(null);
            }}
            onDelete={() => handlePostDelete(selectedPost.id)}
          />
        )}
      </div>
    </div>
  );
}