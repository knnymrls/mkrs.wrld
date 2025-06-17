'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';
import MentionInput from './MentionInput';
import MentionLink from '../ui/MentionLink';
import AuthorLink from '../ui/AuthorLink';
import PostImageUpload from '../ui/PostImageUpload';
import { TrackedMention } from '../../types/mention';
import { Comment } from '../../models/Comment';
import CommentsList from './CommentsList';
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

interface PostModalProps {
  post: Post;
  onClose: () => void;
  onUpdate: (updatedPost: Post) => void;
  onDelete: () => void;
}

export default function PostModal({ post, onClose, onUpdate, onDelete }: PostModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(post.content);
  const [editTrackedMentions, setEditTrackedMentions] = useState<TrackedMention[]>(
    post.mentions.map(m => {
      const index = post.content.indexOf(m.name);
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        start: index !== -1 ? index : 0,
        end: index !== -1 ? index + m.name.length : m.name.length
      };
    })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(post.image_url || null);
  const [editImageWidth, setEditImageWidth] = useState<number | null>(post.image_width || null);
  const [editImageHeight, setEditImageHeight] = useState<number | null>(post.image_height || null);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const renderPostContent = (post: Post) => {
    let content = post.content;
    const elements: React.ReactElement[] = [];
    let lastIndex = 0;

    const mentionPositions = post.mentions.map(mention => {
      const index = content.indexOf(mention.name);
      return { mention, index };
    }).filter(m => m.index !== -1).sort((a, b) => a.index - b.index);

    mentionPositions.forEach(({ mention, index }) => {
      if (index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>{content.substring(lastIndex, index)}</span>
        );
      }

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

    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>
      );
    }

    return elements.length > 0 ? elements : content;
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
          author_id,
          post_id,
          profiles:author_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = data?.map(comment => ({
        id: comment.id,
        post_id: comment.post_id,
        author_id: comment.author_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.created_at,
        author: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      })) || [];

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const updatePost = async () => {
    if (!editPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const embedding = await getEmbedding(editPostContent);

      const { error } = await supabase
        .from('posts')
        .update({
          content: editPostContent,
          embedding,
          image_url: editImageUrl,
          image_width: editImageWidth,
          image_height: editImageHeight,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (error) throw error;

      // Delete existing mentions
      await supabase.from('post_mentions').delete().eq('post_id', post.id);
      await supabase.from('post_projects').delete().eq('post_id', post.id);

      // Add new mentions
      const uniquePersonMentions = Array.from(
        new Map(
          editTrackedMentions
            .filter(m => m.type === 'person')
            .map(m => [m.id, m])
        ).values()
      );

      const uniqueProjectMentions = Array.from(
        new Map(
          editTrackedMentions
            .filter(m => m.type === 'project')
            .map(m => [m.id, m])
        ).values()
      );

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

      const updatedPost = {
        ...post,
        content: editPostContent,
        image_url: editImageUrl,
        image_width: editImageWidth,
        image_height: editImageHeight,
        mentions: editTrackedMentions.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          imageUrl: undefined
        }))
      };

      onUpdate(updatedPost);
      setIsEditingPost(false);
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      if (post.user_has_liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });
      }

      const updatedPost = {
        ...post,
        user_has_liked: !post.user_has_liked,
        likes_count: post.user_has_liked ? post.likes_count - 1 : post.likes_count + 1
      };

      onUpdate(updatedPost);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const createComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: newComment.trim()
        })
        .select(`
          id,
          content,
          created_at,
          author_id,
          post_id
        `)
        .single();

      if (error) throw error;

      const { data: author } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single();

      const newCommentObj: Comment = {
        id: data.id,
        post_id: data.post_id,
        author_id: data.author_id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.created_at,
        author: author || { id: user.id, name: 'Unknown', avatar_url: null }
      };

      setComments([...comments, newCommentObj]);
      setNewComment('');
      
      const updatedPost = {
        ...post,
        comments_count: post.comments_count + 1
      };
      onUpdate(updatedPost);
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-card-bg rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-card-bg border-b border-border-light p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-button-bg rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 mr-3">
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
              <div>
                <AuthorLink
                  authorId={post.author.id}
                  authorName={post.author.name}
                  className="font-semibold text-text-primary"
                />
                <p className="text-sm text-text-muted">
                  {new Date(post.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {post.author.id === user?.id && (
              <div className="flex items-center gap-2">
                {!isEditingPost ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingPost(true);
                        setEditImageUrl(post.image_url || null);
                        setEditImageWidth(post.image_width || null);
                        setEditImageHeight(post.image_height || null);
                      }}
                      className="p-2 hover:bg-button-bg rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="relative z-10 p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      title="Delete post"
                    >
                      <svg className="w-4 h-4 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingPost(false);
                        setEditPostContent(post.content);
                        setEditImageUrl(post.image_url || null);
                        setEditImageWidth(post.image_width || null);
                        setEditImageHeight(post.image_height || null);
                      }}
                      className="px-3 py-1 text-sm font-medium text-text-secondary bg-button-bg rounded-full hover:bg-button-bg-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updatePost}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Post Content or Edit Form */}
          {isEditingPost ? (
            <div className="mb-4">
              <MentionInput
                value={editPostContent}
                onChange={setEditPostContent}
                onMentionsChange={setEditTrackedMentions}
                placeholder="Edit your post..."
                userId={user?.id}
                autoFocus
              />
              
              {/* Image Upload Section */}
              <div className="mt-4">
                <PostImageUpload
                  onImageUpload={(url, width, height) => {
                    setEditImageUrl(url);
                    setEditImageWidth(width);
                    setEditImageHeight(height);
                  }}
                  onImageRemove={() => {
                    setEditImageUrl(null);
                    setEditImageWidth(null);
                    setEditImageHeight(null);
                  }}
                  userId={user?.id || ''}
                  disabled={isSubmitting}
                  imageUrl={editImageUrl}
                  imageWidth={editImageWidth}
                  imageHeight={editImageHeight}
                />
              </div>
            </div>
          ) : (
            <div className="text-text-primary text-base leading-relaxed whitespace-pre-wrap mb-4">
              {renderPostContent(post)}
            </div>
          )}

          {/* Post Image */}
          {post.image_url && !isEditingPost && (
            <div className="mb-4">
              <img 
                src={post.image_url} 
                alt="Post image"
                className="h-auto rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{ maxHeight: '100px', width: 'auto' }}
                onClick={() => setIsImageModalOpen(true)}
              />
            </div>
          )}

          {/* Mentions */}
          {post.mentions.length > 0 && !isEditingPost && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {post.mentions.map((mention) => (
                <button
                  key={`${mention.type}-${mention.id}`}
                  onClick={() => {
                    router.push(mention.type === 'person' ? `/profile/${mention.id}` : `/projects/${mention.id}`);
                    onClose();
                  }}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-button-bg text-text-secondary hover:bg-button-bg-hover transition-colors cursor-pointer"
                >
                  {mention.type === 'person' ? (
                    <div className="w-3 h-3 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-medium text-gray-600 mr-1">
                      {mention.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  )}
                  {mention.name}
                </button>
              ))}
            </div>
          )}

          {/* Like and Comment Section */}
          <div className="border-t border-border-light pt-4">
            <div className="flex items-center justify-between mb-4">
              <LikeButton
                isLiked={post.user_has_liked}
                onClick={toggleLike}
                showCount={false}
              />
              <span className="text-sm text-text-muted">{post.likes_count} {post.likes_count === 1 ? 'fire' : 'fires'}</span>
            </div>

            {/* Comments Section */}
            <CommentsList
              comments={comments}
              setComments={setComments}
              loadingComments={loadingComments}
              newComment={newComment}
              setNewComment={setNewComment}
              submittingComment={submittingComment}
              createComment={createComment}
              post={post}
              onUpdate={onUpdate}
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
    </div>
  );
}