'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import ChatInput from './ChatInput';
import AuthorLink from './AuthorLink';
import { TrackedMention } from '../../types/mention';
import { Comment } from '../../models/Comment';
import CommentsList from './CommentsList';
import LikeButton from './LikeButton';
import ImageModal from '../ui/ImageModal';
import LazyImage from '../ui/LazyImage';
import { renderPostContentWithMentions } from '@/lib/mentions/renderPostMentions';
import { Post } from '../../models/Post';

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

    // Set up real-time subscriptions
    const commentsSubscription = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new comment with author details and mentions
            const { data: newComment } = await supabase
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
              .eq('id', payload.new.id)
              .single();

            if (newComment) {
              // Fetch mentions for the new comment
              const [mentionsResponse, projectMentionsResponse] = await Promise.all([
                supabase
                  .from('comment_mentions')
                  .select(`
                    id,
                    comment_id,
                    profile_id,
                    profiles:profile_id (
                      id,
                      name,
                      avatar_url
                    )
                  `)
                  .eq('comment_id', newComment.id),
                supabase
                  .from('comment_project_mentions')
                  .select(`
                    id,
                    comment_id,
                    project_id,
                    projects:project_id (
                      id,
                      title
                    )
                  `)
                  .eq('comment_id', newComment.id)
              ]);

              const mentions = [
                ...(mentionsResponse.data || []).map(m => ({
                  id: m.id,
                  profile_id: m.profile_id,
                  profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
                })),
                ...(projectMentionsResponse.data || []).map(m => ({
                  id: m.id,
                  project_id: m.project_id,
                  project: Array.isArray(m.projects) ? m.projects[0] : m.projects
                }))
              ];

              const formattedComment: Comment = {
                id: newComment.id,
                post_id: newComment.post_id,
                author_id: newComment.author_id,
                content: newComment.content,
                created_at: newComment.created_at,
                mentions,
                updated_at: newComment.created_at,
                author: Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles
              };

              setComments(prev => [...prev, formattedComment]);
              
              // Update comment count
              const updatedPost = {
                ...post,
                comments_count: post.comments_count + 1
              };
              onUpdate(updatedPost);
            }
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(comment => 
              comment.id === payload.new.id 
                ? { ...comment, content: payload.new.content, updated_at: payload.new.updated_at || payload.new.created_at }
                : comment
            ));
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(comment => comment.id !== payload.old.id));
            
            // Update comment count
            const updatedPost = {
              ...post,
              comments_count: Math.max(0, post.comments_count - 1)
            };
            onUpdate(updatedPost);
          }
        }
      )
      .subscribe();

    // Subscribe to likes changes
    const likesSubscription = supabase
      .channel(`post-likes-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          // Get updated like count
          const { count } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Check if current user has liked
          let userHasLiked = post.user_has_liked;
          if (user) {
            const { data } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .single();
            userHasLiked = !!data;
          }

          const updatedPost = {
            ...post,
            likes_count: count || 0,
            user_has_liked: userHasLiked
          };
          onUpdate(updatedPost);
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      commentsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [post.id, post.comments_count, post.likes_count, post.user_has_liked, user, onUpdate]);

  const renderPostContent = (post: Post) => {
    return renderPostContentWithMentions(post.content, post.mentions);
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

      // Fetch mentions for all comments
      const commentIds = data?.map(c => c.id) || [];
      
      let commentMentions: any[] = [];
      let commentProjectMentions: any[] = [];
      
      if (commentIds.length > 0) {
        const [mentionsResponse, projectMentionsResponse] = await Promise.all([
          supabase
            .from('comment_mentions')
            .select(`
              id,
              comment_id,
              profile_id,
              profiles:profile_id (
                id,
                name,
                avatar_url
              )
            `)
            .in('comment_id', commentIds),
          supabase
            .from('comment_project_mentions')
            .select(`
              id,
              comment_id,
              project_id,
              projects:project_id (
                id,
                title
              )
            `)
            .in('comment_id', commentIds)
        ]);
        
        commentMentions = mentionsResponse.data || [];
        commentProjectMentions = projectMentionsResponse.data || [];
      }

      const formattedComments = data?.map(comment => {
        // Get mentions for this comment
        const mentions = [
          ...commentMentions
            .filter(m => m.comment_id === comment.id)
            .map(m => ({
              id: m.id,
              profile_id: m.profile_id,
              profile: m.profiles
            })),
          ...commentProjectMentions
            .filter(m => m.comment_id === comment.id)
            .map(m => ({
              id: m.id,
              project_id: m.project_id,
              project: m.projects
            }))
        ];
        
        return {
          id: comment.id,
          post_id: comment.post_id,
          author_id: comment.author_id,
          content: comment.content,
          created_at: comment.created_at,
          mentions,
          updated_at: comment.created_at,
          author: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
        };
      }) || [];

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

      // Optimistically update the UI
      const updatedPost = {
        ...post,
        user_has_liked: !post.user_has_liked,
        likes_count: post.user_has_liked ? post.likes_count - 1 : post.likes_count + 1
      };

      onUpdate(updatedPost);
      // The real-time subscription will sync the actual count
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const createComment = async (mentions: TrackedMention[]) => {
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

      // Create mentions for the comment
      const profileMentions = mentions.filter(m => m.type === 'person');
      const projectMentions = mentions.filter(m => m.type === 'project');

      if (profileMentions.length > 0) {
        const { error: mentionError } = await supabase
          .from('comment_mentions')
          .insert(
            profileMentions.map(mention => ({
              comment_id: data.id,
              profile_id: mention.id
            }))
          );
        if (mentionError) throw mentionError;
      }

      if (projectMentions.length > 0) {
        const { error: projectMentionError } = await supabase
          .from('comment_project_mentions')
          .insert(
            projectMentions.map(mention => ({
              comment_id: data.id,
              project_id: mention.id
            }))
          );
        if (projectMentionError) throw projectMentionError;
      }

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
        author: author || { id: user.id, name: 'Unknown', avatar_url: null },
        mentions: [
          ...profileMentions.map(m => ({
            id: m.id,
            profile_id: m.id,
            profile: { id: m.id, name: m.name, avatar_url: m.imageUrl }
          })),
          ...projectMentions.map(m => ({
            id: m.id,
            project_id: m.id,
            project: { id: m.id, title: m.name }
          }))
        ]
      };

      // Check if comment already exists (from real-time subscription)
      if (!comments.some(c => c.id === newCommentObj.id)) {
        setComments([...comments, newCommentObj]);
      }
      setNewComment('');

      // The real-time subscription will handle updating the comment count
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center sm:p-4 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface-container rounded-t-3xl sm:rounded-3xl shadow-lg w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Post Content */}
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-surface-container-muted rounded-full overflow-hidden flex-shrink-0 mr-2 sm:mr-3">
                {post.author.avatar_url ? (
                  <LazyImage
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className=""
                    placeholder="blur"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-sm sm:text-base">
                    {post.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <AuthorLink
                  authorId={post.author.id}
                  authorName={post.author.name}
                  className="font-medium text-sm sm:text-base text-onsurface-primary"
                />
                <p className="text-xs sm:text-sm text-onsurface-secondary">
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
              <div className="flex items-center gap-1">
                {!isEditingPost ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingPost(true);
                        setEditPostContent(post.content);
                        setEditImageUrl(post.image_url || null);
                        setEditImageWidth(post.image_width || null);
                        setEditImageHeight(post.image_height || null);
                        // Re-initialize tracked mentions when entering edit mode
                        setEditTrackedMentions(
                          post.mentions.map(m => {
                            const index = post.content.indexOf(m.name);
                            return {
                              id: m.id,
                              name: m.name,
                              type: m.type,
                              start: index !== -1 ? index : 0,
                              end: index !== -1 ? index + m.name.length : m.name.length,
                              imageUrl: m.imageUrl
                            };
                          })
                        );
                      }}
                      className="p-1.5 sm:p-2 hover:bg-surface-container-muted rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-onsurface-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this post?')) {
                          onDelete();
                        }
                      }}
                      className="relative z-10 p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors cursor-pointer"
                      title="Delete post"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingPost(false);
                      setEditPostContent(post.content);
                      setEditImageUrl(post.image_url || null);
                      setEditImageWidth(post.image_width || null);
                      setEditImageHeight(post.image_height || null);
                      // Reset tracked mentions when canceling
                      setEditTrackedMentions(
                        post.mentions.map(m => {
                          const index = post.content.indexOf(m.name);
                          return {
                            id: m.id,
                            name: m.name,
                            type: m.type,
                            start: index !== -1 ? index : 0,
                            end: index !== -1 ? index + m.name.length : m.name.length,
                            imageUrl: m.imageUrl
                          };
                        })
                      );
                    }}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-onsurface-secondary bg-surface-container-muted rounded-full hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Post Content or Edit Form */}
          {isEditingPost ? (
            <div className="mb-4">
              <ChatInput
                value={editPostContent}
                onChange={setEditPostContent}
                onMentionsChange={setEditTrackedMentions}
                onSubmit={updatePost}
                placeholder="Edit your post..."
                userId={user?.id}
                variant="post"
                initialMentions={editTrackedMentions}
                onImagesChange={(images) => {
                  // For now, we'll just handle the first image since the current post structure only supports one
                  if (Array.isArray(images) && images.length > 0) {
                    const firstImage = images[0];
                    setEditImageUrl(firstImage.url);
                    setEditImageWidth(firstImage.width);
                    setEditImageHeight(firstImage.height);
                  } else {
                    setEditImageUrl(null);
                    setEditImageWidth(null);
                    setEditImageHeight(null);
                  }
                }}
                images={editImageUrl ? [{
                  url: editImageUrl,
                  width: editImageWidth || 0,
                  height: editImageHeight || 0
                }] : []}
                rows={3}
              />
            </div>
          ) : (
            <div className="text-onsurface-primary text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-3 sm:mb-4">
              {renderPostContent(post)}
            </div>
          )}

          {/* Post Image */}
          {post.image_url && !isEditingPost && (
            <div 
              className="mb-3 sm:mb-4 cursor-zoom-in" 
              style={{ maxHeight: '60vh' }}
              onClick={() => setIsImageModalOpen(true)}
            >
              <LazyImage
                src={post.image_url}
                alt="Post image"
                width={post.image_width || undefined}
                height={post.image_height || undefined}
                className="rounded-lg hover:opacity-90 transition-opacity"
                placeholder="blur"
              />
            </div>
          )}

          {/* Like and Comment Section */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <LikeButton
                isLiked={post.user_has_liked}
                onClick={toggleLike}
                showCount={true}
                count={post.likes_count}
              />
            </div>
            <span className="text-xs sm:text-sm text-onsurface-secondary">{post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}</span>
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