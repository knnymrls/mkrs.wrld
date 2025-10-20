'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AuthorLink from './AuthorLink';
import QuickCommentInput from './QuickCommentInput';
import LikeButton from './LikeButton';
import ImageModal from '../ui/ImageModal';
import LazyImage from '../ui/LazyImage';
import { TrackedMention } from '@/app/types/mention';
import { renderPostContentWithMentions } from '@/lib/mentions/renderPostMentions';

interface PostImage {
  id: string;
  url: string;
  width: number;
  height: number;
  position: number;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  mentions: Array<{ id: string; name: string; type: 'person' | 'project'; imageUrl?: string | null; icon?: string | null }>;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  tag?: string | null;
  // Legacy single image fields
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  // New multiple images
  images?: PostImage[];
  // Optional type field for ActivityGrid compatibility
  type?: 'post';
}

interface PostCardProps {
  post: Post;
  onPostClick: (post: Post) => void;
  onLikeToggle: (postId: string, isLiked: boolean) => Promise<void>;
  onCommentSubmit: (postId: string) => Promise<void>;
  quickComments: { [postId: string]: string };
  setQuickComments: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  submittingQuickComment: { [postId: string]: boolean };
  quickCommentMentions: { [postId: string]: TrackedMention[] };
  setQuickCommentMentions: React.Dispatch<React.SetStateAction<{ [postId: string]: TrackedMention[] }>>;
}

const PostCard = React.memo(function PostCard({
  post,
  onPostClick,
  onLikeToggle,
  onCommentSubmit,
  quickComments,
  setQuickComments,
  submittingQuickComment,
  quickCommentMentions,
  setQuickCommentMentions
}: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Get all images (new format or legacy format) - memoized
  const images = useMemo(() => {
    if (post.images && post.images.length > 0) {
      return post.images.map(img => ({ url: img.url, width: img.width, height: img.height }));
    } else if (post.image_url) {
      return [{ url: post.image_url, width: post.image_width || 0, height: post.image_height || 0 }];
    }
    return [];
  }, [post.images, post.image_url, post.image_width, post.image_height]);

  // Memoize post content rendering using the utility function
  const renderedContent = useMemo(() => {
    return renderPostContentWithMentions(post.content, post.mentions);
  }, [post.content, post.mentions]);

  // Callbacks to prevent re-renders
  const handleImageClick = useCallback((e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  }, []);

  const handleLikeToggle = useCallback(() => {
    onLikeToggle(post.id, post.user_has_liked);
  }, [onLikeToggle, post.id, post.user_has_liked]);

  const handleCommentSubmit = useCallback(() => {
    onCommentSubmit(post.id);
  }, [onCommentSubmit, post.id]);

  const handleCommentChange = useCallback((value: string) => {
    setQuickComments(prev => ({ ...prev, [post.id]: value }));
  }, [setQuickComments, post.id]);

  const handleMentionsChange = useCallback((mentions: TrackedMention[]) => {
    setQuickCommentMentions(prev => ({ ...prev, [post.id]: mentions }));
  }, [setQuickCommentMentions, post.id]);

  return (
    <>
      <div
        className="bg-surface-container rounded-[15px] border border-border cursor-pointer break-inside-avoid mb-4"
        onClick={() => onPostClick(post)}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Top row: Avatar and Date/Tag */}
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
              {post.author.avatar_url ? (
                <LazyImage
                  src={post.author.avatar_url}
                  alt={post.author.name}
                  className="w-full h-full object-cover"
                  placeholder="blur"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-base">
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {post.tag && (
              <p className="text-sm text-onsurface-secondary font-medium">
                #{post.tag}
              </p>
            )}
          </div>

          {/* Content section: Username and post text */}
          <div className="flex flex-col gap-1 w-full">
            <AuthorLink
              authorId={post.author.id}
              authorName={post.author.name}
              className="text-sm font-medium text-onsurface-secondary"
            />

            <div className="text-base text-onsurface-primary leading-normal whitespace-pre-wrap break-words">
              {renderedContent}
            </div>
          </div>

          {/* Post Images */}
          {images.length > 0 && (
            <div className="w-full">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-md cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={(e) => handleImageClick(e, image.url)}
                >
                  <img
                    src={image.url}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom row: Comment Input and Like Button */}
          <div
            className="flex items-center gap-3 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickCommentInput
              postId={post.id}
              value={quickComments[post.id] || ''}
              onChange={handleCommentChange}
              onSubmit={handleCommentSubmit}
              onMentionsChange={handleMentionsChange}
              disabled={submittingQuickComment[post.id]}
              userId={user?.id}
            />
            <LikeButton
              isLiked={post.user_has_liked}
              onClick={handleLikeToggle}
            />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageUrl && (
        <ImageModal
          isOpen={isImageModalOpen}
          imageUrl={selectedImageUrl}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImageUrl(null);
          }}
        />
      )}
    </>
  );
});

export default PostCard;