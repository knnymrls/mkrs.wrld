'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';
import MentionInput from '../components/features/MentionInput';
import { TrackedMention } from '../types/mention';

interface Post {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
  };
  mentions: Array<{ id: string; name: string; type: 'person' | 'project' }>;
}


export default function Home() {
  const { user, hasProfile, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && hasProfile === false) {
      router.replace('/onboarding');
    }
  }, [user, hasProfile, loading, router]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        author_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      // Fetch author and mentions for each post
      const postsWithDetails = await Promise.all(
        (data || []).map(async (post) => {
          // Fetch author
          const { data: author } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', post.author_id)
            .single();

          // Fetch person mentions
          const { data: personMentions } = await supabase
            .from('post_mentions')
            .select(`
              profiles:profile_id (
                id,
                name
              )
            `)
            .eq('post_id', post.id);

          // Fetch project mentions
          const { data: projectMentions } = await supabase
            .from('post_projects')
            .select(`
              projects:project_id (
                id,
                title
              )
            `)
            .eq('post_id', post.id);

          const mentions: Post['mentions'] = [
            ...(personMentions || []).map((m: any) => ({
              id: m.profiles.id,
              name: m.profiles.name,
              type: 'person' as const
            })),
            ...(projectMentions || []).map((m: any) => ({
              id: m.projects.id,
              name: m.projects.title,
              type: 'project' as const
            }))
          ];

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            author: author || { id: post.author_id, name: 'Unknown' },
            mentions
          };
        })
      );

      setPosts(postsWithDetails);
    }
    setLoadingPosts(false);
  };


  const createPost = async () => {
    if (!postContent.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Generate embedding
      const embedding = await getEmbedding(postContent);

      // Create post
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          content: postContent,
          author_id: user.id,
          embedding
        })
        .select()
        .single();

      if (error) throw error;

      // Deduplicate mentions - only save unique mentions
      const uniquePersonMentions = Array.from(
        new Map(
          trackedMentions
            .filter(m => m.type === 'person')
            .map(m => [m.id, m])
        ).values()
      );

      const uniqueProjectMentions = Array.from(
        new Map(
          trackedMentions
            .filter(m => m.type === 'project')
            .map(m => [m.id, m])
        ).values()
      );

      // Add unique person mentions
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

      // Add unique project mentions
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

      // Reset form
      setPostContent('');
      setTrackedMentions([]);
      setIsCreatingPost(false);
      
      // Refresh posts
      await fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPostContent = (post: Post) => {
    let content = post.content;
    const elements: React.ReactElement[] = [];
    let lastIndex = 0;

    // Sort mentions by their position in the content (without @ symbol)
    const mentionPositions = post.mentions.map(mention => {
      const index = content.indexOf(mention.name);
      return { mention, index };
    }).filter(m => m.index !== -1).sort((a, b) => a.index - b.index);

    mentionPositions.forEach(({ mention, index }) => {
      // Add text before mention
      if (index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>{content.substring(lastIndex, index)}</span>
        );
      }

      // Add mention as link (without @ symbol)
      elements.push(
        <a
          key={`mention-${mention.id}`}
          href={mention.type === 'person' ? `/profile/${mention.id}` : `/projects/${mention.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            router.push(mention.type === 'person' ? `/profile/${mention.id}` : `/projects/${mention.id}`);
          }}
        >
          {mention.name}
        </a>
      );

      lastIndex = index + mention.name.length;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>
      );
    }

    return elements.length > 0 ? elements : content;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Feed</h2>

        {/* New Post Creation */}
        {!isCreatingPost ? (
          <button
            onClick={() => setIsCreatingPost(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
          >
            <span className="text-gray-500 dark:text-gray-400">What's on your mind? Click to share...</span>
          </button>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative">
            <MentionInput
              value={postContent}
              onChange={setPostContent}
              onMentionsChange={setTrackedMentions}
              placeholder="Share your thoughts... Use @ to mention people or projects"
              userId={user?.id}
              autoFocus
            />


            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreatingPost(false);
                  setPostContent('');
                  setTrackedMentions([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!postContent.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {/* Posts List */}
        {loadingPosts ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No posts yet. Be the first to share!</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {post.author.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {renderPostContent(post)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
