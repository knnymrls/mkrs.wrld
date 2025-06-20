import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { formatPost } from '../utils/postFormatters';
import { ActivityItem } from '@/app/components/features/ActivityGrid';

/**
 * Custom hook for managing activity feed data and operations
 */
export function useActivityFeed(user: User | null) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const supabase = createClientComponentClient();

  const fetchPosts = useCallback(async (limit?: number, offset?: number) => {
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
      .range(offset || 0, (offset || 0) + (limit || 20) - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    // Format each post using the helper function
    const postsWithDetails = await Promise.all(
      (data || []).map(post => formatPost(post, user))
    );

    return postsWithDetails;
  }, [supabase, user]);

  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true);
      setPage(0);
      setHasMore(true);
      
      // Fetch posts with a limit to mix with other activities
      const postsPromise = fetchPosts(20, 0);

      // Fetch all profiles (only on initial load)
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

      // Fetch all projects (only on initial load)
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
        } as ActivityItem);
      });

      // Add profiles
      if (profilesResult.data) {
        profilesResult.data.forEach(profile => {
          allActivities.push({
            ...profile,
            type: 'profile' as const,
            skills: profile.skills || []
          } as ActivityItem);
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
          } as ActivityItem);
        });
      }

      // Sort all activities by created_at
      allActivities.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(allActivities);
      
      // Check if we have more posts to load
      if (posts.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, [fetchPosts, supabase]);

  const loadMoreActivities = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const offset = nextPage * 20;
      
      // Only fetch more posts for infinite scroll
      const morePosts = await fetchPosts(20, offset);
      
      if (morePosts.length === 0) {
        setHasMore(false);
        return;
      }

      const newActivities: ActivityItem[] = morePosts.map(post => ({
        ...post,
        type: 'post' as const
      } as ActivityItem));

      setActivities(prev => [...prev, ...newActivities]);
      setPage(nextPage);
      
      // Check if we have more posts to load
      if (morePosts.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPosts, page, loadingMore, hasMore]);

  const updateActivity = useCallback((activityId: string, updates: Partial<ActivityItem>) => {
    setActivities(prev => prev.map(activity => 
      activity.id === activityId ? { ...activity, ...updates } as ActivityItem : activity
    ));
  }, []);

  const removeActivity = useCallback((activityId: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== activityId));
  }, []);

  const addActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev: ActivityItem[]) => [activity, ...prev]);
  }, []);

  return {
    activities,
    loadingActivities,
    loadingMore,
    hasMore,
    fetchActivities,
    loadMoreActivities,
    updateActivity,
    removeActivity,
    addActivity,
    setActivities
  };
}