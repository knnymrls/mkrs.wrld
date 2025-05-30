'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const { user, hasProfile, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<{ id: string; content: string }[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!loading && user && hasProfile === false) {
      router.replace('/onboarding');
    }
  }, [user, hasProfile, loading, router]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content')
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching posts:', error);
      else setPosts(data || []);
      setLoadingPosts(false);
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Posts</h2>
          <Link
            href="/posts/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + New Post
          </Link>
        </div>

        {loadingPosts ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No posts yet. Create your first one!</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
              >
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
