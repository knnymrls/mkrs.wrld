import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { TrackedMention } from '@/app/types/mention';

interface UsePostInteractionsOptions {
  user: User | null;
  onActivityUpdate: (activityId: string, updates: any) => void;
}

/**
 * Custom hook for managing post interactions (likes, comments)
 */
export function usePostInteractions({ user, onActivityUpdate }: UsePostInteractionsOptions) {
  const [quickComments, setQuickComments] = useState<{ [postId: string]: string }>({});
  const [quickCommentMentions, setQuickCommentMentions] = useState<{ [postId: string]: TrackedMention[] }>({});
  const [submittingQuickComment, setSubmittingQuickComment] = useState<{ [postId: string]: boolean }>({});
  
  const supabase = createClientComponentClient();

  const toggleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (currentlyLiked) {
        // Unlike the post
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        // Update the activity
        onActivityUpdate(postId, {
          user_has_liked: false,
          likes_count: 0 // This will be recalculated
        });
      } else {
        // Like the post
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });

        // Update the activity
        onActivityUpdate(postId, {
          user_has_liked: true,
          likes_count: 0 // This will be recalculated
        });
      }

      // Fetch updated like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      // Update with actual count
      onActivityUpdate(postId, {
        likes_count: count || 0
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [user, supabase, onActivityUpdate]);

  const createQuickComment = useCallback(async (postId: string) => {
    if (!user || !quickComments[postId]?.trim()) return;

    setSubmittingQuickComment(prev => ({ ...prev, [postId]: true }));

    try {
      // Insert the comment
      const { data: comment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: quickComments[postId].trim()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert mentions if any
      const mentions = quickCommentMentions[postId] || [];
      if (mentions.length > 0 && comment) {
        const mentionInserts = mentions.map(mention => ({
          comment_id: comment.id,
          profile_id: mention.id
        }));

        await supabase
          .from('comment_mentions')
          .insert(mentionInserts);
      }

      // Clear the comment input
      setQuickComments(prev => ({ ...prev, [postId]: '' }));
      setQuickCommentMentions(prev => ({ ...prev, [postId]: [] }));

      // Update comment count
      const { count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      onActivityUpdate(postId, {
        comments_count: count || 0
      });
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setSubmittingQuickComment(prev => ({ ...prev, [postId]: false }));
    }
  }, [user, quickComments, quickCommentMentions, supabase, onActivityUpdate]);

  return {
    toggleLike,
    createQuickComment,
    quickComments,
    setQuickComments,
    quickCommentMentions,
    setQuickCommentMentions,
    submittingQuickComment
  };
}