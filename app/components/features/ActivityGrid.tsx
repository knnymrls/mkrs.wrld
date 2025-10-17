'use client';

import React, { useCallback } from 'react';
import PostCard from './PostCard';
import ProfileCard from './ProfileCard';
import ProjectCard from './ProjectCard';
import ProjectRequestCardGrid from './ProjectRequestCardGrid';
import PostCardSkeleton from '../ui/PostCardSkeleton';
import { TrackedMention } from '@/app/types/mention';
import { useInfiniteScroll } from '../../(main)/hooks/useInfiniteScroll';
import * as Masonry from '@/app/components/ui/masonry';

type ActivityItemType = 'post' | 'profile' | 'project' | 'project_request';

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

interface ProjectRequestActivity extends BaseActivity {
  type: 'project_request';
  title: string;
  description?: string;
  skills_needed: string[];
  time_commitment: 'few_hours' | 'few_days' | 'week' | 'few_weeks' | 'month' | 'months';
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'in_review' | 'filled' | 'cancelled';
  max_participants: number;
  created_by: string;
  creator?: {
    id: string;
    name: string;
    title?: string;
    avatar_url?: string;
  };
}

export type ActivityItem = PostActivity | ProfileActivity | ProjectActivity | ProjectRequestActivity;

interface ActivityGridProps {
  items: ActivityItem[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPostClick?: (post: ActivityItem) => void;
  onLikeToggle?: (postId: string, isLiked: boolean) => Promise<void>;
  onCommentSubmit?: (postId: string) => Promise<void>;
  quickComments?: { [postId: string]: string };
  setQuickComments?: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  submittingQuickComment?: { [postId: string]: boolean };
  quickCommentMentions?: { [postId: string]: TrackedMention[] };
  setQuickCommentMentions?: React.Dispatch<React.SetStateAction<{ [postId: string]: TrackedMention[] }>>;
}

// Default functions outside component to prevent recreating
const noop = () => { };
const asyncNoop = async () => { };

const ActivityGrid = React.memo(function ActivityGrid({
  items,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onPostClick,
  onLikeToggle,
  onCommentSubmit,
  quickComments = {},
  setQuickComments = noop,
  submittingQuickComment = {},
  quickCommentMentions = {},
  setQuickCommentMentions = noop
}: ActivityGridProps) {
  const triggerRef = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: onLoadMore || (() => { }),
    threshold: 200
  });

  if (loading) {
    return (
      <Masonry.Root columnWidth={280} gap={12}>
        <PostCardSkeleton count={4} variant="short" />
        <PostCardSkeleton count={4} variant="medium" />
        <PostCardSkeleton count={4} variant="long" />
      </Masonry.Root>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 w-full text-center">
        <p className="mb-2 text-text-muted">No activity yet</p>
        <p className="text-sm text-text-light">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <>
      <Masonry.Root columnWidth={280} gap={12}>
        {items.map((item) => {
          switch (item.type) {
            case 'post':
              return (
                <Masonry.Item key={item.id}>
                  <PostCard
                    post={item}
                    onPostClick={onPostClick ? () => onPostClick(item) : asyncNoop}
                    onLikeToggle={onLikeToggle || asyncNoop}
                    onCommentSubmit={onCommentSubmit || asyncNoop}
                    quickComments={quickComments}
                    setQuickComments={setQuickComments}
                    submittingQuickComment={submittingQuickComment}
                    quickCommentMentions={quickCommentMentions}
                    setQuickCommentMentions={setQuickCommentMentions}
                  />
                </Masonry.Item>
              );
            case 'profile':
              return (
                <Masonry.Item key={item.id}>
                  <ProfileCard profile={item} />
                </Masonry.Item>
              );
            case 'project':
              return (
                <Masonry.Item key={item.id}>
                  <ProjectCard project={item} />
                </Masonry.Item>
              );
            case 'project_request':
              return (
                <Masonry.Item key={item.id}>
                  <ProjectRequestCardGrid request={item} />
                </Masonry.Item>
              );
            default:
              return null;
          }
        })}
      </Masonry.Root>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={triggerRef} className="w-full py-8">
          {loadingMore && (
            <Masonry.Root columnWidth={280} gap={12}>
              <PostCardSkeleton count={3} variant="medium" />
            </Masonry.Root>
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && items.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-onsurface-secondary">That's all for now!</p>
        </div>
      )}
    </>
  );
});

export default ActivityGrid;