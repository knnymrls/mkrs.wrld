'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { TrackedMention } from '../types/mention';
import CreatePostModal from '../components/features/CreatePostModal';
import PostModal from '../components/features/PostModal';
import ActivityGrid, { ActivityItem } from '../components/features/ActivityGrid';
import NotificationDropdown from '../components/features/NotificationDropdown';

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
  const [quickCommentMentions, setQuickCommentMentions] = useState<{ [postId: string]: TrackedMention[] }>({});

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

  // Set up real-time subscriptions - consolidated into single channel
  useEffect(() => {
    if (!user) return;

    // Single channel for all activity updates
    const activityChannel = supabase
      .channel('activity-feed-realtime', {
        config: {
          presence: { key: user.id }
        }
      })
      // Subscribe to new posts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload: any) => {
          // Fetch the full post with author info
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              author_id,
              profiles:author_id (
                id,
                name,
                avatar_url
              ),
              post_mentions (
                profile_id,
                profiles:profile_id (
                  id,
                  name,
                  avatar_url
                )
              ),
              post_projects (
                project_id,
                projects:project_id (
                  id,
                  title
                )
              ),
              post_likes (user_id),
              post_comments (id),
              image_url,
              image_width,
              image_height,
              post_images (
                id,
                url,
                width,
                height,
                position
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const formattedPost = await formatPost(data);
            setActivities(prev => [{
              ...formattedPost,
              type: 'post' as const
            }, ...prev]);
          }
        }
      )
      // Subscribe to new profiles
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        async (payload: any) => {
          // Fetch the full profile with skills
          const { data } = await supabase
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
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setActivities(prev => [{
              ...data,
              type: 'profile' as const
            }, ...prev]);
          }
        }
      )
      // Subscribe to new projects
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects'
        },
        async (payload: any) => {
          // Fetch the full project with contributors
          const { data } = await supabase
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
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setActivities(prev => [{
              ...data,
              type: 'project' as const
            }, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to activity feed updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to activity feed:', status);
        }
      });

    // Cleanup function
    return () => {
      activityChannel.unsubscribe().then(() => {
        supabase.removeChannel(activityChannel);
      });
    };
  }, [user]);

  // Helper function to format a single post
  const formatPost = async (postData: any) => {
    // Handle both raw post data and already fetched post with relations
    const post = postData;
    
    // If author data is nested, extract it
    const author = post.profiles ? 
      (Array.isArray(post.profiles) ? post.profiles[0] : post.profiles) :
      null;

    // Get mentions from nested relations or fetch separately
    let mentions: Post['mentions'] = [];
    
    if (post.post_mentions || post.post_projects) {
      // Use nested data if available
      mentions = [
        ...(post.post_mentions || []).map((m: any) => ({
          id: m.profiles?.id || m.profile_id,
          name: m.profiles?.name || '',
          type: 'person' as const,
          imageUrl: m.profiles?.avatar_url || null
        })),
        ...(post.post_projects || []).map((m: any) => ({
          id: m.projects?.id || m.project_id,
          name: m.projects?.title || '',
          type: 'project' as const,
          imageUrl: m.projects?.image_url || null
        }))
      ];
    } else {
      // Fetch mentions separately if not included
      const [personMentions, projectMentions] = await Promise.all([
        supabase
          .from('post_mentions')
          .select(`
            profiles:profile_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('post_id', post.id),
        supabase
          .from('post_projects')
          .select(`
            projects:project_id (
              id,
              title,
              image_url
            )
          `)
          .eq('post_id', post.id)
      ]);

      mentions = [
        ...(personMentions.data || []).map((m: any) => ({
          id: m.profiles.id,
          name: m.profiles.name,
          type: 'person' as const,
          imageUrl: m.profiles.avatar_url
        })),
        ...(projectMentions.data || []).map((m: any) => ({
          id: m.projects.id,
          name: m.projects.title,
          type: 'project' as const,
          imageUrl: m.projects.image_url
        }))
      ];
    }

    // Get engagement metrics
    let likesCount = 0;
    let userHasLiked = false;
    let commentsCount = 0;

    if (post.post_likes && Array.isArray(post.post_likes)) {
      likesCount = post.post_likes.length;
      userHasLiked = user ? post.post_likes.some((like: any) => like.user_id === user.id) : false;
    } else {
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      likesCount = count || 0;

      if (user) {
        const { data: userLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();
        userHasLiked = !!userLike;
      }
    }

    if (post.post_comments && Array.isArray(post.post_comments)) {
      commentsCount = post.post_comments.length;
    } else {
      const { count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      commentsCount = count || 0;
    }

    // Get images
    const images = post.post_images || [];

    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      author: author || { id: post.author_id, name: 'Unknown', avatar_url: null },
      mentions,
      likes_count: likesCount,
      comments_count: commentsCount,
      user_has_liked: userHasLiked,
      image_url: post.image_url,
      image_width: post.image_width,
      image_height: post.image_height,
      images: images.sort((a: any, b: any) => a.position - b.position)
    };
  };

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
            contributors: (project.contributions || []).map((contrib: any) => ({
              person: contrib.person
            }))
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
        image_height,
        profiles:author_id (
          id,
          name,
          avatar_url
        ),
        post_mentions (
          profile_id,
          profiles:profile_id (
            id,
            name,
            avatar_url
          )
        ),
        post_projects (
          project_id,
          projects:project_id (
            id,
            title,
            image_url
          )
        ),
        post_likes (user_id),
        post_comments (id),
        post_images (
          id,
          url,
          width,
          height,
          position
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit || 50);

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    // Format each post using the helper function
    const postsWithDetails = await Promise.all(
      (data || []).map(post => formatPost(post))
    );

    return postsWithDetails;
  };

  const handlePostClick = (post: ActivityItem) => {
    if (post.type !== 'post') return;
    setSelectedPost(post);
  };

  const handleOpenPostFromNotification = async (postId: string) => {
    // Find the post in current activities
    const postActivity = activities.find(a => a.type === 'post' && a.id === postId);
    
    if (postActivity && postActivity.type === 'post') {
      setSelectedPost(postActivity);
    } else {
      // If not in activities, fetch the post
      try {
        const { data: post, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            author_id,
            embedding,
            updated_at,
            image_url,
            image_width,
            image_height,
            profiles:author_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('id', postId)
          .single();

        if (error) throw error;

        if (post) {
          // Format the post using the existing formatPost function
          const formattedPost = await formatPost(post);
          setSelectedPost(formattedPost);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    }
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

    const mentions = quickCommentMentions[postId] || [];

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

      // Clear the input and mentions
      setQuickComments({ ...quickComments, [postId]: '' });
      setQuickCommentMentions({ ...quickCommentMentions, [postId]: [] });

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
    <div className="min-h-screen bg-background py-16 px-6">
      <div>
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-medium text-onsurface-primary">Activity Feed</h1>

          <div className="flex items-center gap-3">
            {/* Notification Button */}
            {user && (
              <NotificationDropdown 
                userId={user.id} 
                onPostClick={handleOpenPostFromNotification}
              />
            )}
            
            {/* New Post Button */}
            <button
              onClick={() => setIsCreatingPost(true)}
              className="px-4 py-2 hover:bg-primary-hover text-primary hover:text-surface-container-muted border-primary-hover border-[1px] rounded-full bg-surface-container transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create</span>
            </button>
          </div>
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
          quickCommentMentions={quickCommentMentions}
          setQuickCommentMentions={setQuickCommentMentions}
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