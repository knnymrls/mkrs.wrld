'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { TrackedMention } from '../types/mention';
import CreatePostModal from '../components/features/CreatePostModal';
import PostModal from '../components/features/PostModal';
import ActivityGrid, { ActivityItem } from '../components/features/ActivityGrid';

interface PostImage {
  id: string;
  url: string;
  width: number;
  height: number;
  position: number;
}

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
  // Legacy single image fields
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  // New multiple images
  images?: PostImage[];
}

export default function Home() {
  const { user, hasProfile, loading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [quickComments, setQuickComments] = useState<{ [postId: string]: string }>({});
  const [submittingQuickComment, setSubmittingQuickComment] = useState<{ [postId: string]: boolean }>({});

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle ESC key
      if (e.key === 'Escape') {
        setIsCreatingPost(false);
        setSelectedPost(null);
      }
      
      // Handle Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
      // Check for uppercase 'P' since Shift is pressed
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCreatingPost(prev => !prev); // Toggle the modal
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!loading && user && hasProfile === false) {
      router.replace('/onboarding');
    }
  }, [user, hasProfile, loading, router]);

  useEffect(() => {
    fetchActivities();
  }, [user]); // Re-fetch when user changes

  const fetchActivities = async () => {
    try {
      // Fetch posts with a limit to mix with other activities
      const postsPromise = fetchPosts(20);
      
      // Fetch all profiles
      const profilesPromise = supabase
        .from('profiles')
        .select(`
          id,
          name,
          title,
          bio,
          avatar_url,
          location,
          created_at,
          skills!skills_profile_id_fkey (skill)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Fetch all projects
      const projectsPromise = supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          created_by,
          contributions!contributions_project_id_fkey (
            person:person_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const [posts, profilesResult, projectsResult] = await Promise.all([
        postsPromise,
        profilesPromise,
        projectsPromise
      ]);

      const allActivities: ActivityItem[] = [];

      // Add posts
      posts.forEach(post => {
        allActivities.push({
          ...post,
          type: 'post' as const
        });
      });

      // Add profiles
      if (profilesResult.data) {
        profilesResult.data.forEach(profile => {
          allActivities.push({
            ...profile,
            type: 'profile' as const,
            skills: profile.skills || []
          });
        });
      }

      // Add projects
      if (projectsResult.data) {
        projectsResult.data.forEach(project => {
          allActivities.push({
            ...project,
            type: 'project' as const,
            contributors: project.contributions || []
          });
        });
      }

      // Sort all activities by created_at
      allActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchPosts = async (limit?: number) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        author_id,
        image_url,
        image_width,
        image_height
      `)
      .order('created_at', { ascending: false })
      .limit(limit || 50);

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      // Fetch author and mentions for each post
      const postsWithDetails = await Promise.all(
        (data || []).map(async (post) => {
          // Fetch author
          const { data: author } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', post.author_id)
            .single();

          // Fetch person mentions
          const { data: personMentions } = await supabase
            .from('post_mentions')
            .select(`
              profiles:profile_id (
                id,
                name,
                avatar_url
              )
            `)
            .eq('post_id', post.id);

          // Fetch project mentions
          const { data: projectMentions } = await supabase
            .from('post_projects')
            .select(`
              projects:project_id (
                id,
                title,
                image_url
              )
            `)
            .eq('post_id', post.id);

          const mentions: Post['mentions'] = [
            ...(personMentions || []).map((m: any) => ({
              id: m.profiles.id,
              name: m.profiles.name,
              type: 'person' as const,
              imageUrl: m.profiles.avatar_url
            })),
            ...(projectMentions || []).map((m: any) => ({
              id: m.projects.id,
              name: m.projects.title,
              type: 'project' as const,
              imageUrl: m.projects.image_url
            }))
          ];

          // Fetch likes count and check if current user has liked
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let userHasLiked = false;
          if (user) {
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .single();
            userHasLiked = !!userLike;
          }

          // Fetch comments count
          const { count: commentsCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Fetch multiple images
          const { data: postImages } = await supabase
            .from('post_images')
            .select('id, url, width, height, position')
            .eq('post_id', post.id)
            .order('position', { ascending: true });

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            author: author || { id: post.author_id, name: 'Unknown', avatar_url: null },
            mentions,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: userHasLiked,
            image_url: post.image_url,
            image_width: post.image_width,
            image_height: post.image_height,
            images: postImages || []
          };
        })
      );

      return postsWithDetails;
    }
    return [];
  };

  const handlePostClick = (post: ActivityItem) => {
    if (post.type !== 'post') return;
    setSelectedPost(post);
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setActivities(activities.map(activity => {
      if (activity.type === 'post' && activity.id === updatedPost.id) {
        return { ...updatedPost, type: 'post' as const };
      }
      return activity;
    }));
    setSelectedPost(updatedPost);
  };

  const handlePostDelete = async () => {
    if (!selectedPost) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', selectedPost.id);
      
      if (error) throw error;

      // Refresh activities and close modal
      setSelectedPost(null);
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
      }

      // Update local state
      setActivities(activities.map(activity => {
        if (activity.type === 'post' && activity.id === postId) {
          return {
            ...activity,
            user_has_liked: !isLiked,
            likes_count: isLiked ? activity.likes_count - 1 : activity.likes_count + 1
          };
        }
        return activity;
      }));

      // Update selected post if it's the same post
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          user_has_liked: !isLiked,
          likes_count: isLiked ? selectedPost.likes_count - 1 : selectedPost.likes_count + 1
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const createQuickComment = async (postId: string) => {
    const commentText = quickComments[postId]?.trim();
    if (!commentText || !user) return;

    setSubmittingQuickComment({ ...submittingQuickComment, [postId]: true });
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: commentText
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

      // Clear the input
      setQuickComments({ ...quickComments, [postId]: '' });

      // Update comment count in activities
      setActivities(activities.map(activity => {
        if (activity.type === 'post' && activity.id === postId) {
          return {
            ...activity,
            comments_count: activity.comments_count + 1
          };
        }
        return activity;
      }));

      // If this post is currently selected, update it too
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          comments_count: selectedPost.comments_count + 1
        });
      }
    } catch (error) {
      console.error('Error creating quick comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmittingQuickComment({ ...submittingQuickComment, [postId]: false });
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 px-6">
      <div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary">Activity Feed</h1>

          {/* New Post Button */}
          <button
            onClick={() => setIsCreatingPost(true)}
            className="px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create</span>
          </button>
        </div>

        {/* Activity Grid */}
        <ActivityGrid
          items={activities}
          loading={loadingActivities}
          onPostClick={handlePostClick}
          onLikeToggle={toggleLike}
          onCommentSubmit={createQuickComment}
          quickComments={quickComments}
          setQuickComments={setQuickComments}
          submittingQuickComment={submittingQuickComment}
        />
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatingPost}
        onClose={() => setIsCreatingPost(false)}
        onPostCreated={fetchActivities}
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      )}
    </div>
  );
}