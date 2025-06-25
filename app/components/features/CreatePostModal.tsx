'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import ChatInput from './ChatInput';
import MentionLink from '../ui/MentionLink';
import { TrackedMention } from '../../types/mention';

interface ImageData {
  url: string;
  width: number;
  height: number;
  loading?: boolean;
  tempId?: string;
}

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
  const [images, setImages] = useState<ImageData[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPostContent('');
    setTrackedMentions([]);
    setImages([]);
    onClose();
  };

  const handleImagesChange = (newImages: ImageData[] | ((prev: ImageData[]) => ImageData[])) => {
    if (typeof newImages === 'function') {
      setImages(newImages);
    } else {
      setImages(newImages);
    }
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

    // Check if any images are still loading
    const loadingImages = images.filter(img => img.loading);
    if (loadingImages.length > 0) {
      alert('Please wait for all images to finish uploading');
      return;
    }

    setIsSubmitting(true);
    try {
      const embedding = await getEmbedding(postContent);

      // Filter out any loading images (just in case)
      const uploadedImages = images.filter(img => !img.loading && img.url);

      // For backward compatibility, use the first image for the legacy fields
      const firstImage = uploadedImages[0];

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          content: postContent,
          author_id: user.id,
          embedding,
          image_url: firstImage?.url || null,
          image_width: firstImage?.width || null,
          image_height: firstImage?.height || null
        })
        .select()
        .single();

      if (error) throw error;

      // Insert multiple images into the new post_images table
      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map((img, index) => ({
          post_id: post.id,
          url: img.url,
          width: img.width,
          height: img.height,
          position: index
        }));

        const { error: imagesError } = await supabase
          .from('post_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

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
      className="fixed inset-0 bg-black/35 flex items-center justify-center p-4"
      style={{ zIndex: 9998 }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="flex-1 px-6 py-4">
          <ChatInput
            ref={inputRef}
            value={postContent}
            onChange={setPostContent}
            onMentionsChange={setTrackedMentions}
            onSubmit={createPost}
            placeholder="What's on your mind? Use @ to mention people or projects..."
            userId={user?.id}
            disabled={isSubmitting}
            loading={isSubmitting}
            rows={3}
            allowProjectCreation={true}
            variant="post"
            onImagesChange={handleImagesChange}
            images={images}
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