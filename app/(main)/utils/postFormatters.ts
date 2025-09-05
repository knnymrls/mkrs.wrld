import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Post, PostImage } from '@/app/models/Post';
import { Profile } from '@/app/models/Profile';
import { Project } from '@/app/models/Project';

// Partial profile type for nested queries
interface PartialProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface RawPostData {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: PartialProfile | PartialProfile[] | null;
  post_mentions?: Array<{
    profile_id: string;
    profiles?: PartialProfile;
  }>;
  post_projects?: Array<{
    project_id: string;
    projects?: Partial<Project>;
  }>;
  post_likes?: Array<{
    user_id: string;
  }>;
  post_comments?: Array<{
    id: string;
  }>;
  post_images?: PostImage[];
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
}

/**
 * Formats raw post data from Supabase into a structured Post object
 * Handles both pre-fetched relations and separate fetching of relations
 */
export async function formatPost(postData: RawPostData, user: User | null): Promise<Post> {
  const supabase = createClient();
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
      ...(post.post_mentions || []).map((m) => ({
        id: m.profiles?.id || m.profile_id,
        name: m.profiles?.name || '',
        type: 'person' as const,
        imageUrl: m.profiles?.avatar_url || null
      })),
      ...(post.post_projects || []).map((m) => ({
        id: m.projects?.id || m.project_id,
        name: m.projects?.title || '',
        type: 'project' as const,
        imageUrl: m.projects?.image_url || null,
        icon: m.projects?.icon || null
      }))
    ];
  } else {
    // Fetch mentions separately if not included
    const [personMentions, projectMentions] = await Promise.all([
      supabase
        .from('post_mentions')
        .select(`
          profiles!profile_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('post_id', post.id),
      supabase
        .from('post_projects')
        .select(`
          projects!project_id (
            id,
            title,
            image_url,
            icon
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
        imageUrl: m.projects.image_url,
        icon: m.projects.icon
      }))
    ];
  }

  // Get engagement metrics
  let likesCount = 0;
  let userHasLiked = false;
  let commentsCount = 0;

  if (post.post_likes && Array.isArray(post.post_likes)) {
    likesCount = post.post_likes.length;
    userHasLiked = user ? post.post_likes.some((like) => like.user_id === user.id) : false;
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
    images: images.sort((a, b) => a.position - b.position)
  };
}