'use client';

import React from 'react';
import PostCard from './PostCard';
import ProfileCard from './ProfileCard';
import ProjectCard from './ProjectCard';
import PostCardSkeleton from '../ui/PostCardSkeleton';

type ActivityItemType = 'post' | 'profile' | 'project';

interface BaseActivity {
  id: string;
  type: ActivityItemType;
  created_at: string;
}

interface PostActivity extends BaseActivity {
  type: 'post';
  content: string;
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

interface ProfileActivity extends BaseActivity {
  type: 'profile';
  name: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  skills?: Array<{ skill: string }>;
}

interface ProjectActivity extends BaseActivity {
  type: 'project';
  title: string;
  description?: string | null;
  status: 'active' | 'paused' | 'complete';
  created_by: string;
  contributors?: Array<{
    person: {
      id: string;
      name: string;
      avatar_url?: string | null;
    };
  }>;
}

export type ActivityItem = PostActivity | ProfileActivity | ProjectActivity;

interface ActivityGridProps {
  items: ActivityItem[];
  loading: boolean;
  onPostClick?: (post: PostActivity) => void;
  onLikeToggle?: (postId: string, isLiked: boolean) => Promise<void>;
  onCommentSubmit?: (postId: string) => Promise<void>;
  quickComments?: { [postId: string]: string };
  setQuickComments?: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  submittingQuickComment?: { [postId: string]: boolean };
}

export default function ActivityGrid({
  items,
  loading,
  onPostClick,
  onLikeToggle,
  onCommentSubmit,
  quickComments = {},
  setQuickComments = () => {},
  submittingQuickComment = {}
}: ActivityGridProps) {
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

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted mb-2">No activity yet</p>
        <p className="text-sm text-text-light">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div style={{ columnCount: 'auto', columnWidth: '280px', columnGap: '16px', position: 'relative' }}>
      {items.map((item) => {
        switch (item.type) {
          case 'post':
            return (
              <PostCard
                key={item.id}
                post={item}
                onPostClick={onPostClick || (() => {})}
                onLikeToggle={onLikeToggle || (async () => {})}
                onCommentSubmit={onCommentSubmit || (async () => {})}
                quickComments={quickComments}
                setQuickComments={setQuickComments}
                submittingQuickComment={submittingQuickComment}
              />
            );
          case 'profile':
            return <ProfileCard key={item.id} profile={item} />;
          case 'project':
            return <ProjectCard key={item.id} project={item} />;
          default:
            return null;
        }
      })}
    </div>
  );
}