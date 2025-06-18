'use client';

import React, { useState } from 'react';
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
      <h4 className="font-medium text-text-primary">Comments ({post.comments_count})</h4>

      {/* Comment Input */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
          {user ? (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm font-medium">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          ) : null}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                createComment();
              }
            }}
            placeholder="Write a comment..."
            className="flex-1 text-sm text-text-secondary placeholder-text-light bg-input-bg rounded-lg px-3 py-2 border-none outline-none focus:outline-none focus:bg-input-bg-focus transition-colors"
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CommentSkeleton key={index} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-3">
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
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm font-medium">
                    {comment.author?.name.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-input-bg rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{comment.author?.name}</p>
                    {comment.author_id === user?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditCommentText(comment.content);
                          }}
                          className="p-1 hover:bg-button-bg rounded transition-colors"
                        >
                          <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            updateComment(comment.id, editCommentText);
                          } else if (e.key === 'Escape') {
                            setEditingComment(null);
                            setEditCommentText('');
                          }
                        }}
                        autoFocus
                        className="w-full text-sm text-text-secondary bg-background rounded px-2 py-1 border border-border-light focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateComment(comment.id, editCommentText)}
                          className="px-2 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary-hover transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingComment(null);
                            setEditCommentText('');
                          }}
                          className="px-2 py-1 text-xs font-medium text-text-secondary bg-button-bg rounded hover:bg-button-bg-hover transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary mt-0.5">{comment.content}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-muted">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}