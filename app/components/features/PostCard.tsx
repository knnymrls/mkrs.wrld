'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import MentionLink from '../ui/MentionLink';
import AuthorLink from '../ui/AuthorLink';
import QuickCommentInput from './QuickCommentInput';
import LikeButton from './LikeButton';
import ImageModal from '../ui/ImageModal';

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

interface PostCardProps {
  post: Post;
  onPostClick: (post: Post) => void;
  onLikeToggle: (postId: string, isLiked: boolean) => Promise<void>;
  onCommentSubmit: (postId: string) => Promise<void>;
  quickComments: { [postId: string]: string };
  setQuickComments: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  submittingQuickComment: { [postId: string]: boolean };
}

export default function PostCard({
  post,
  onPostClick,
  onLikeToggle,
  onCommentSubmit,
  quickComments,
  setQuickComments,
  submittingQuickComment
}: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const renderPostContent = (post: Post) => {
    let content = post.content;
    const elements: React.ReactElement[] = [];
    let lastIndex = 0;

    // Sort mentions by their position in the content (without @ symbol)
    const mentionPositions = post.mentions.map(mention => {
      const index = content.indexOf(mention.name);
      return { mention, index };
    }).filter(m => m.index !== -1).sort((a, b) => a.index - b.index);

    mentionPositions.forEach(({ mention, index }) => {
      // Add text before mention
      if (index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`} className="align-middle">{content.substring(lastIndex, index)}</span>
        );
      }

      // Add mention as link
      elements.push(
        <MentionLink
          key={`mention-${mention.id}`}
          id={mention.id}
          name={mention.name}
          type={mention.type}
          imageUrl={mention.imageUrl}
        />
      );

      lastIndex = index + mention.name.length;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${lastIndex}`} className="align-middle">{content.substring(lastIndex)}</span>
      );
    }

    return elements.length > 0 ? elements : content;
  };

  return (
    <>
      <div
        className="bg-card-bg rounded-2xl border-[1px] border-border hover:scale-105 transition-all duration-200 overflow-hidden group cursor-pointer break-inside-avoid mb-4"
        onClick={() => onPostClick(post)}
      >
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center justify-between">
              <div className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary font-medium">
                    {post.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: post.created_at.substring(0, 4) !== new Date().getFullYear().toString() ? 'numeric' : undefined
                })}
              </p>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <AuthorLink
                authorId={post.author.id}
                authorName={post.author.name}
                className="text-sm font-sans text-text-secondary"
              />

              <div className="text-text-primary leading-relaxed whitespace-pre-wrap">
                {renderPostContent(post)}
              </div>
            </div>
          </div>

          {/* Post Image */}
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="h-auto border-[1px] border-border rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
              style={{ maxHeight: '250px', width: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageModalOpen(true);
              }}
            />
          )}

          {/* Quick Comment Input and Like Button */}
          <div
            className=" flex items-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickCommentInput
              postId={post.id}
              value={quickComments[post.id] || ''}
              onChange={(value) => setQuickComments({ ...quickComments, [post.id]: value })}
              onSubmit={() => onCommentSubmit(post.id)}
              disabled={submittingQuickComment[post.id]}
            />
            <LikeButton
              isLiked={post.user_has_liked}
              onClick={() => onLikeToggle(post.id, post.user_has_liked)}
            />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {post.image_url && (
        <ImageModal
          isOpen={isImageModalOpen}
          imageUrl={post.image_url}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </>
  );
}