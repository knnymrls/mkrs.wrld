'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';
import ChatInput from './ChatInput';
import MentionLink from '../ui/MentionLink';
import { TrackedMention } from '../../types/mention';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);

  const handleClose = () => {
    setPostContent('');
    setTrackedMentions([]);
    setImageUrl(null);
    setImageWidth(null);
    setImageHeight(null);
    onClose();
  };

  const handleImageUpload = (url: string, width: number, height: number) => {
    setImageUrl(url);
    setImageWidth(width);
    setImageHeight(height);
  };

  const handleImageRemove = () => {
    setImageUrl(null);
    setImageWidth(null);
    setImageHeight(null);
  };

  const renderPostPreview = () => {
    if (!postContent.trim()) return null;

    const elements: React.ReactElement[] = [];
    let lastIndex = 0;

    // Sort mentions by their position in the content (without @ symbol)
    const mentionPositions = trackedMentions.map(mention => {
      const index = postContent.indexOf(mention.name);
      return { mention, index };
    }).filter(m => m.index !== -1).sort((a, b) => a.index - b.index);

    mentionPositions.forEach(({ mention, index }) => {
      // Add text before mention
      if (index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`} className="align-middle">{postContent.substring(lastIndex, index)}</span>
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
    if (lastIndex < postContent.length) {
      elements.push(
        <span key={`text-${lastIndex}`} className="align-middle">{postContent.substring(lastIndex)}</span>
      );
    }

    return elements.length > 0 ? elements : postContent;
  };

  const createPost = async () => {
    if (!postContent.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const embedding = await getEmbedding(postContent);

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          content: postContent,
          author_id: user.id,
          embedding,
          image_url: imageUrl,
          image_width: imageWidth,
          image_height: imageHeight
        })
        .select()
        .single();

      if (error) throw error;

      // Deduplicate mentions
      const uniquePersonMentions = Array.from(
        new Map(
          trackedMentions
            .filter(m => m.type === 'person')
            .map(m => [m.id, m])
        ).values()
      );

      const uniqueProjectMentions = Array.from(
        new Map(
          trackedMentions
            .filter(m => m.type === 'project')
            .map(m => [m.id, m])
        ).values()
      );

      // Add mentions
      if (uniquePersonMentions.length > 0) {
        await supabase
          .from('post_mentions')
          .insert(
            uniquePersonMentions.map(m => ({
              post_id: post.id,
              profile_id: m.id
            }))
          );
      }

      if (uniqueProjectMentions.length > 0) {
        await supabase
          .from('post_projects')
          .insert(
            uniqueProjectMentions.map(m => ({
              post_id: post.id,
              project_id: m.id
            }))
          );
      }

      handleClose();
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/25 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="flex-1 px-6 py-4">
          <ChatInput
            value={postContent}
            onChange={setPostContent}
            onMentionsChange={setTrackedMentions}
            onSubmit={createPost}
            placeholder="What's on your mind? Use @ to mention people or projects..."
            userId={user?.id}
            disabled={isSubmitting}
            loading={isSubmitting}
            allowProjectCreation={true}
            variant="post"
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />

          {/* Preview Section
          {postContent.trim() && (
            <div className="mt-4 p-4 bg-surface-container-muted rounded-lg">
              <p className="text-sm text-onsurface-secondary mb-1">Preview:</p>
              <div className="text-onsurface-primary">
                {renderPostPreview()}
              </div>
            </div>
          )} */}
        </div>

      </div>
    </div>
  );
}