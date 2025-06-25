import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { QueryParser } from '@/app/api/chat/utils/query-parser';
import { semanticSearch } from '@/app/api/chat/strategies/semantic';
import { Suggestion } from '@/app/components/features/AIAssistant/SuggestionBubble';

interface ContextRequest {
  context: {
    type: 'post' | 'profile' | 'project' | null;
    id: string | null;
    content: string | null;
    metadata?: Record<string, any>;
  };
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { context, userId } = await req.json() as ContextRequest;

    if (!context.type || !context.id || !context.content) {
      return NextResponse.json({ suggestions: [] });
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: authHeader || '',
          },
        },
      }
    );

    const suggestions: Suggestion[] = [];

    // Analyze based on context type
    if (context.type === 'post') {
      // Parse the post content to extract key terms
      const parser = new QueryParser();
      const parsed = parser.parse(context.content);
      
      // Find related posts
      const relatedResults = await semanticSearch(
        supabase,
        context.content,
        ['posts'],
        5
      );

      // Filter out the current post
      const relatedPosts = relatedResults.posts.filter(p => p.id !== context.id);

      if (relatedPosts.length > 0) {
        suggestions.push({
          id: 'related-posts',
          type: 'similarity',
          title: 'Similar discussions',
          description: `${relatedPosts.length} related posts about ${parsed.entities.join(', ') || 'this topic'}`,
          action: {
            label: 'View related',
            href: `/search?q=${encodeURIComponent(context.content.slice(0, 50))}`,
          },
        });
      }

      // Find people with relevant expertise
      if (parsed.entities.length > 0) {
        const expertResults = await semanticSearch(
          supabase,
          parsed.entities.join(' '),
          ['profiles'],
          5
        );

        if (expertResults.profiles.length > 0) {
          const expertNames = expertResults.profiles
            .slice(0, 2)
            .map(p => p.name)
            .join(' and ');

          suggestions.push({
            id: 'experts',
            type: 'connection',
            title: 'Connect with experts',
            description: `${expertNames} have expertise in this area`,
            action: {
              label: 'View profiles',
              href: `/search?q=${encodeURIComponent(parsed.entities[0])}&type=people`,
            },
          });
        }
      }

      // Check for trending discussions
      if (relatedPosts.length >= 3) {
        const recentPosts = relatedPosts.filter(p => {
          const postDate = new Date(p.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return postDate > weekAgo;
        });

        if (recentPosts.length >= 2) {
          suggestions.push({
            id: 'trending',
            type: 'trend',
            title: 'Trending topic',
            description: `This topic has ${recentPosts.length} recent discussions`,
            action: {
              label: 'Join conversation',
              href: `/chatbot?q=${encodeURIComponent(context.content.slice(0, 50))}`,
            },
          });
        }
      }
    } else if (context.type === 'profile') {
      // Get profile details
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', context.id)
        .single();

      if (profile) {
        // Find recent activity
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', context.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentPosts && recentPosts.length > 0) {
          // Extract topics from recent posts
          const topics = new Set<string>();
          for (const post of recentPosts) {
            const parsed = new QueryParser().parse(post.content);
            parsed.entities.forEach(e => topics.add(e));
          }

          if (topics.size > 0) {
            suggestions.push({
              id: 'recent-activity',
              type: 'insight',
              title: 'Recent activity',
              description: `Active in ${Array.from(topics).slice(0, 3).join(', ')} discussions`,
              action: {
                label: 'View posts',
                href: `/profile/${context.id}`,
              },
            });
          }
        }

        // Find common connections
        if (userId && userId !== context.id) {
          // This would require a more complex query to find mutual connections
          // For now, we'll add a placeholder
          suggestions.push({
            id: 'connections',
            type: 'connection',
            title: 'Network insights',
            description: 'Discover mutual connections and shared interests',
            action: {
              label: 'Explore network',
              href: `/graph?highlight=${context.id}`,
            },
          });
        }
      }
    } else if (context.type === 'project') {
      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', context.id)
        .single();

      if (project) {
        // Get contributors
        const { data: contributors } = await supabase
          .from('contributions')
          .select('*, person:profiles(*)')
          .eq('project_id', context.id);

        if (contributors && contributors.length > 0) {
          suggestions.push({
            id: 'contributors',
            type: 'connection',
            title: 'Project team',
            description: `${contributors.length} people are contributing`,
            action: {
              label: 'View team',
              href: `/projects/${context.id}#contributors`,
            },
          });
        }

        // Check project activity
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('*, post_projects!inner(project_id)')
          .eq('post_projects.project_id', context.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentPosts && recentPosts.length > 5) {
          suggestions.push({
            id: 'activity',
            type: 'trend',
            title: 'High activity',
            description: `${recentPosts.length} recent updates`,
            action: {
              label: 'View updates',
              href: `/projects/${context.id}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error analyzing context:', error);
    return NextResponse.json(
      { error: 'Failed to analyze context' },
      { status: 500 }
    );
  }
}