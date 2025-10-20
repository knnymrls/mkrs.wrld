"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { getEmbedding } from "@/lib/embeddings/index";
import MentionInput from "../ui/MentionInput";
import LazyImage from "../ui/LazyImage";
import { TrackedMention } from "../../types/mention";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  defaultCommunityId?: string;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
  defaultCommunityId,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState("");
  const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const tags = [
    { value: 'ask', label: '#ask' },
    { value: 'help', label: '#help' },
    { value: 'announcement', label: '#announcement' },
    { value: 'discussion', label: '#discussion' },
    { value: 'showcase', label: '#showcase' }
  ];

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url, name")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserAvatar(data.avatar_url);
          setUserName(data.name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPostContent("");
      setTrackedMentions([]);
      setImages([]);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPostContent("");
    setTrackedMentions([]);
    setImages([]);
    onClose();
  };

  const createPost = async () => {
    if (!postContent.trim() || !user) return;

    // Check if any images are still loading
    const loadingImages = images.filter((img) => img.loading);
    if (loadingImages.length > 0) {
      alert("Please wait for all images to finish uploading");
      return;
    }

    setIsSubmitting(true);
    try {
      const embedding = await getEmbedding(postContent);

      // Filter out any loading images (just in case)
      const uploadedImages = images.filter((img) => !img.loading && img.url);

      // For backward compatibility, use the first image for the legacy fields
      const firstImage = uploadedImages[0];

      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          content: postContent,
          author_id: user.id,
          tag: selectedTag,
          embedding,
          image_url: firstImage?.url || null,
          image_width: firstImage?.width || null,
          image_height: firstImage?.height || null,
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
          position: index,
        }));

        const { error: imagesError } = await supabase
          .from("post_images")
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      // Deduplicate mentions
      const uniquePersonMentions = Array.from(
        new Map(
          trackedMentions
            .filter((m) => m.type === "person")
            .map((m) => [m.id, m])
        ).values()
      );

      const uniqueProjectMentions = Array.from(
        new Map(
          trackedMentions
            .filter((m) => m.type === "project")
            .map((m) => [m.id, m])
        ).values()
      );

      // Add mentions
      if (uniquePersonMentions.length > 0) {
        await supabase.from("post_mentions").insert(
          uniquePersonMentions.map((m) => ({
            post_id: post.id,
            profile_id: m.id,
          }))
        );
      }

      if (uniqueProjectMentions.length > 0) {
        await supabase.from("post_projects").insert(
          uniqueProjectMentions.map((m) => ({
            post_id: post.id,
            project_id: m.id,
          }))
        );
      }

      handleClose();
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      alert(
        `Failed to create post: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
        className="bg-surface rounded-[15px] w-full max-w-xl flex flex-col p-6 gap-4"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Row: Avatar + Close */}
        <div className="flex items-center justify-between w-full">
          {/* Avatar */}
          <div className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
            {userAvatar ? (
              <LazyImage
                src={userAvatar}
                alt={userName || "User"}
                className="w-full h-full object-cover"
                placeholder="blur"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-base">
                {userName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-4 h-4 flex items-center justify-center text-onsurface-secondary hover:text-onsurface-primary transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Text Area */}
        <div className="h-[153px] w-full">
          <MentionInput
            value={postContent}
            onChange={setPostContent}
            onMentionsChange={setTrackedMentions}
            placeholder="What's on your mind..."
            userId={user?.id}
            disabled={isSubmitting}
            rows={6}
            autoFocus
            className="border-0 bg-transparent px-0 focus-visible:ring-0 text-base text-onsurface-secondary placeholder:text-onsurface-secondary"
          />
        </div>

        {/* Bottom Row: Icons + Actions */}
        <div className="flex items-center justify-between w-full">
          {/* Left: Image and Mention Icons */}
          <div className="flex items-center gap-4">
            <button className="w-6 h-6 flex items-center justify-center text-onsurface-secondary hover:text-onsurface-primary transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button className="w-6 h-6 flex items-center justify-center text-onsurface-secondary hover:text-onsurface-primary transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </button>
          </div>

          {/* Right: Select Tag + Create Post Button */}
          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-onsurface-primary hover:bg-opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedTag ? tags.find(t => t.value === selectedTag)?.label : "Select a tag"}{" "}
                  {!selectedTag && <span className="font-bold">↗</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {tags.map((tag) => (
                  <DropdownMenuItem
                    key={tag.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTag(tag.value);
                    }}
                  >
                    {tag.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={createPost}
              disabled={isSubmitting || !postContent.trim()}
              className="bg-onsurface-primary px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-opacity"
            >
              <p className="text-sm font-medium text-surface-container text-center leading-tight">
                {isSubmitting ? "Posting..." : "Create Post"}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
