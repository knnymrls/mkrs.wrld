'use client';

import React from 'react';
import PostCard from './PostCard';
import PostCardSkeleton from '../ui/PostCardSkeleton';

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
}

interface PostGridProps {
  posts: Post[];
  loading: boolean;
  onPostClick: (post: Post) => void;
  onLikeToggle: (postId: string, isLiked: boolean) => Promise<void>;
  onCommentSubmit: (postId: string) => Promise<void>;
  quickComments: { [postId: string]: string };
  setQuickComments: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  submittingQuickComment: { [postId: string]: boolean };
}

export default function PostGrid({
  posts,
  loading,
  onPostClick,
  onLikeToggle,
  onCommentSubmit,
  quickComments,
  setQuickComments,
  submittingQuickComment
}: PostGridProps) {
  if (loading) {
    return (
      <div style={{ columnCount: 'auto', columnWidth: '280px', columnGap: '16px', position: 'relative' }}>
        {Array.from({ length: 12 }).map((_, index) => {
          const variants = ['short', 'medium', 'long'] as const;
          const variant = variants[index % 3];
          return <PostCardSkeleton key={index} variant={variant} />;
        })}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted mb-2">No posts yet</p>
        <p className="text-sm text-text-light">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div style={{ columnCount: 'auto', columnWidth: '280px', columnGap: '16px', position: 'relative' }}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPostClick={onPostClick}
          onLikeToggle={onLikeToggle}
          onCommentSubmit={onCommentSubmit}
          quickComments={quickComments}
          setQuickComments={setQuickComments}
          submittingQuickComment={submittingQuickComment}
        />
      ))}
    </div>
  );
}