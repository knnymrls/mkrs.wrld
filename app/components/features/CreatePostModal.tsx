'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import MentionInput from '../ui/MentionInput';
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPostContent('');
      setTrackedMentions([]);
      setImages([]);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPostContent('');
    setTrackedMentions([]);
    setImages([]);
    onClose();
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
      className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleClose}
    >
      <div
        className="bg-surface-container rounded-2xl w-full max-w-2xl flex flex-col p-6"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-onsurface-primary">Create Post</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface-container-muted rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-onsurface-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          <MentionInput
            value={postContent}
            onChange={setPostContent}
            onMentionsChange={setTrackedMentions}
            placeholder="What's on your mind? Type @ to mention people or projects..."
            userId={user?.id}
            disabled={isSubmitting}
            rows={6}
            autoFocus
          />

          {/* Submit Button */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-onsurface-secondary hover:bg-surface-container-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createPost}
              disabled={isSubmitting || !postContent.trim()}
              className="px-4 py-2 text-sm font-medium text-white dark:text-background bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}