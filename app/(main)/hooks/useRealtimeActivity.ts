import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { formatPost } from '../utils/postFormatters';
import { ActivityItem } from '@/app/components/features/ActivityGrid';

interface UseRealtimeActivityOptions {
  user: User | null;
  onNewActivity: (activity: ActivityItem) => void;
}

/**
 * Custom hook for subscribing to real-time activity updates
 * Consolidates posts, profiles, and projects into a single channel
 */
export function useRealtimeActivity({ user, onNewActivity }: UseRealtimeActivityOptions) {
  const supabase = createClientComponentClient();

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
            const formattedPost = await formatPost(data, user);
            onNewActivity({
              ...formattedPost,
              type: 'post' as const
            } as ActivityItem);
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
            onNewActivity({
              ...data,
              type: 'profile' as const
            } as ActivityItem);
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
            onNewActivity({
              ...data,
              type: 'project' as const,
              contributors: data.contributions?.map((contrib: any) => ({
                person: contrib.person
              })) || []
            } as ActivityItem);
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
  }, [user, onNewActivity, supabase]);
}