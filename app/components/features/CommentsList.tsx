'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Comment } from '../../models/Comment';
import CommentSkeleton from '../ui/CommentSkeleton';

interface Post {
  id: string;
  comments_count: number;
}

interface CommentsListProps {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  loadingComments: boolean;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  submittingComment: boolean;
  createComment: () => void;
  post: Post;
  onUpdate: (updatedPost: any) => void;
}

export default function CommentsList({
  comments,
  setComments,
  loadingComments,
  newComment,
  setNewComment,
  submittingComment,
  createComment,
  post,
  onUpdate
}: CommentsListProps) {
  const { user } = useAuth();
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name?: string; avatar_url?: string | null } | null>(null);

  // Fetch current user's profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();

        if (data) {
          setCurrentUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const updateComment = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: newContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.map(comment =>
        comment.id === commentId
          ? { ...comment, content: newContent.trim(), updated_at: new Date().toISOString() }
          : comment
      ));
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(comment => comment.id !== commentId));

      const updatedPost = {
        ...post,
        comments_count: post.comments_count - 1
      };
      onUpdate(updatedPost);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };


  return (
    <div className="space-y-4">

      {/* Comment Input */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
          {currentUserProfile?.avatar_url ? (
            <img
              src={currentUserProfile.avatar_url}
              alt={currentUserProfile.name || 'User'}
              className="w-full h-full object-cover"
            />
          ) : currentUserProfile?.name ? (
            <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-sm font-medium">
              {currentUserProfile.name.charAt(0).toUpperCase()}
            </div>
          ) : user ? (
            <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-sm font-medium">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          ) : null}
        </div>
        <div className="flex-1 flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                createComment();
              }
            }}
            placeholder="Write a comment..."
            className="flex-1 bg-surface-container-muted text-sm text-onsurface-primary placeholder-onsurface-secondary rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-onsurface-secondary transition-all"
            rows={1}
            style={{ minHeight: '38px' }}
          />
          <button
            onClick={createComment}
            disabled={!newComment.trim() || submittingComment}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {submittingComment ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Posting...
              </div>
            ) : 'Post'}
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loadingComments ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <CommentSkeleton key={index} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-onsurface-secondary text-center py-4">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
                {comment.author?.avatar_url ? (
                  <img
                    src={comment.author.avatar_url}
                    alt={comment.author.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-sm font-medium">
                    {comment.author?.name.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-surface-container-muted rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-onsurface-primary">{comment.author?.name}</p>
                      <span className="text-xs text-onsurface-secondary">•</span>
                      <p className="text-xs text-onsurface-secondary">
                        {new Date(comment.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {comment.updated_at !== comment.created_at && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </p>
                    </div>
                    {comment.author_id === user?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditCommentText(comment.content);
                          }}
                          className="p-1 hover:bg-surface-container rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-onsurface-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            updateComment(comment.id, editCommentText);
                          } else if (e.key === 'Escape') {
                            setEditingComment(null);
                            setEditCommentText('');
                          }
                        }}
                        autoFocus
                        className="w-full text-sm text-onsurface-primary bg-surface-container rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-onsurface-secondary transition-all"
                        rows={1}
                        style={{ minHeight: '36px' }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateComment(comment.id, editCommentText)}
                          className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-full hover:bg-primary-hover transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingComment(null);
                            setEditCommentText('');
                          }}
                          className="px-3 py-1 text-xs font-medium text-onsurface-secondary bg-surface-container rounded-full hover:bg-surface-container-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-onsurface-primary mt-0.5">{comment.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}