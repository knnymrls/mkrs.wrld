import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// Deep graph traversal for rich insights
async function performGraphTraversal(
  supabase: any,
  entityType: string,
  entityId: string
) {
  const insights: any = {
    connections: [],
    recentActivity: [],
    relatedContent: [],
    stats: {}
  };

  if (entityType === 'profile') {
    // Get the person's details with skills
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        *,
        skills(skill)
      `)
      .eq('id', entityId)
      .single();

    if (profile) {
      // Get ALL their posts for better stats
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('author_id', entityId)
        .order('created_at', { ascending: false });

      // Get recent posts with more details
      const { data: recentPosts } = await supabase
        .from('posts')
        .select(`
          id, 
          content, 
          created_at,
          post_mentions(
            profile:profiles(id, name)
          ),
          post_projects(
            project:projects(id, title)
          )
        `)
        .eq('author_id', entityId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get projects they contribute to
      const { data: contributions } = await supabase
        .from('contributions')
        .select(`
          role,
          project:projects(
            id,
            title,
            status,
            description
          )
        `)
        .eq('person_id', entityId);

      // Get people they've mentioned in their posts
      const { data: mentionedByThem } = await supabase
        .from('posts')
        .select(`
          post_mentions(
            profile:profiles(id, name, title)
          )
        `)
        .eq('author_id', entityId);

      // Get people who work on the same projects
      let collaborators: any[] = [];
      if (contributions && contributions.length > 0) {
        const projectIds = contributions.map(c => c.project.id);
        const { data: projectCollaborators } = await supabase
          .from('contributions')
          .select(`
            person:profiles(id, name, title),
            project:projects(title)
          `)
          .in('project_id', projectIds)
          .neq('person_id', entityId);
        
        collaborators = projectCollaborators || [];
      }

      // Extract topics from posts
      const topics = extractTopicsFromPosts(recentPosts || []);

      // Calculate stats
      insights.stats = {
        totalPosts: allPosts?.length || 0,
        projectCount: contributions?.length || 0,
        skillCount: profile.skills?.length || 0,
        activeTopics: topics
      };

      insights.recentActivity = recentPosts || [];
      
      // Process and deduplicate collaborators
      const allCollaborators = [
        ...collaborators.map(c => ({ ...c.person, source: 'project' })),
        ...(mentionedByThem?.flatMap(p => p.post_mentions?.map((m: any) => ({ ...m.profile, source: 'mention' })) || []) || [])
      ];
      
      insights.connections = {
        projects: contributions?.map(c => c.project).filter(p => p) || [],
        frequentCollaborators: deduplicatePeople(allCollaborators)
      };
      
      // Store profile data in insights
      insights.profile = profile;
    }
  } else if (entityType === 'post') {
    // Get the post details
    const { data: post } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        post_mentions(profile:profiles(*)),
        post_projects(project:projects(*))
      `)
      .eq('id', entityId)
      .single();

    if (post) {
      // Find similar posts by the same author
      const { data: authorPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', post.author_id)
        .neq('id', entityId)
        .order('created_at', { ascending: false })
        .limit(3);

      // Find posts that mention the same people/projects
      const mentionedIds = post.post_mentions?.map((m: any) => m.profile.id) || [];
      const projectIds = post.post_projects?.map((p: any) => p.project.id) || [];

      let relatedPosts: any[] = [];
      if (mentionedIds.length > 0 || projectIds.length > 0) {
        const { data: related } = await supabase
          .from('posts')
          .select('*, author:profiles!posts_author_id_fkey(name)')
          .or(`id.in.(${await getRelatedPostIds(supabase, mentionedIds, projectIds)})`)
          .neq('id', entityId)
          .limit(5);
        
        relatedPosts = related || [];
      }

      insights.stats = {
        authorPostCount: authorPosts?.length || 0,
        mentionCount: post.post_mentions?.length || 0,
        relatedDiscussions: relatedPosts.length
      };

      insights.connections = {
        author: post.author,
        mentionedPeople: post.post_mentions?.map((m: any) => m.profile) || [],
        mentionedProjects: post.post_projects?.map((p: any) => p.project) || []
      };

      insights.relatedContent = {
        byAuthor: authorPosts || [],
        similar: relatedPosts
      };
    }
  } else if (entityType === 'project') {
    // Get project details with contributors
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        contributions(
          person:profiles(*),
          role
        )
      `)
      .eq('id', entityId)
      .single();

    if (project) {
      // Get recent posts about this project
      const { data: projectPosts } = await supabase
        .from('post_projects')
        .select('posts(*,author:profiles!posts_author_id_fkey(name))')
        .eq('project_id', entityId)
        .order('posts.created_at', { ascending: false })
        .limit(10);

      // Extract key contributors
      const keyContributors = project.contributions
        ?.filter((c: any) => c.role === 'lead' || c.role === 'owner')
        .map((c: any) => c.person) || [];

      insights.stats = {
        teamSize: project.contributions?.length || 0,
        recentActivityCount: projectPosts?.length || 0,
        status: project.status,
        keyContributors: keyContributors.length
      };

      insights.connections = {
        team: project.contributions?.map((c: any) => ({
          ...c.person,
          role: c.role
        })) || [],
        keyContributors
      };

      insights.recentActivity = projectPosts?.map((pp: any) => pp.posts) || [];
    }
  }

  return insights;
}

// Helper functions
function extractTopicsFromPosts(posts: any[]): string[] {
  const topics = new Set<string>();
  posts.forEach(post => {
    // Simple topic extraction - could be enhanced with NLP
    const words = post.content.toLowerCase().split(/\s+/);
    const techTerms = words.filter((w: string) => 
      w.length > 4 && /^[a-z]+$/.test(w) && !commonWords.has(w)
    );
    techTerms.slice(0, 3).forEach((t: string) => topics.add(t));
  });
  return Array.from(topics).slice(0, 5);
}

function deduplicatePeople(people: any[]): any[] {
  const seen = new Set();
  return people.filter(p => {
    const id = p.id || p.profile?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function getRelatedPostIds(supabase: any, personIds: string[], projectIds: string[]): Promise<string> {
  const ids = new Set<string>();
  
  if (personIds.length > 0) {
    const { data } = await supabase
      .from('post_mentions')
      .select('post_id')
      .in('profile_id', personIds);
    data?.forEach((d: any) => ids.add(d.post_id));
  }
  
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('post_projects')
      .select('post_id')
      .in('project_id', projectIds);
    data?.forEach((d: any) => ids.add(d.post_id));
  }
  
  return Array.from(ids).join(',');
}

const commonWords = new Set(['about', 'after', 'again', 'where', 'there', 'their', 'which', 'would', 'could', 'should']);

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

    // Perform deep graph traversal
    const insights = await performGraphTraversal(supabase, context.type, context.id);
    const suggestions: Suggestion[] = [];

    // Generate a summary based on graph traversal
    if (context.type === 'profile') {
      // Get profile data from insights or fetch it if missing
      let profile = insights.profile;
      
      if (!profile) {
        const { data } = await supabase
          .from('profiles')
          .select('*, skills(skill)')
          .eq('id', context.id)
          .single();
        profile = data;
      }
      
      const projects = insights.connections.projects || [];
      const collaborators = insights.connections.frequentCollaborators || [];
      const recentPosts = insights.recentActivity || [];
      const topics = insights.stats.activeTopics || [];
      
      // Build a rich, multi-faceted summary
      const summaryParts: string[] = [];
      
      // Professional role and expertise
      if (profile?.title) {
        const skillsList = profile.skills?.map((s: any) => s.skill) || [];
        if (skillsList.length > 0) {
          summaryParts.push(`${profile.title} with expertise in ${skillsList.slice(0, 3).join(', ')}`);
        } else {
          summaryParts.push(profile.title);
        }
      }
      
      // Current work focus
      if (projects.length > 0) {
        const activeProjects = projects.filter((p: any) => p.status === 'active');
        const projectTypes = projects.map((p: any) => {
          // Extract key themes from project titles
          const title = p.title.toLowerCase();
          if (title.includes('ml') || title.includes('ai')) return 'AI/ML';
          if (title.includes('frontend') || title.includes('ui')) return 'Frontend';
          if (title.includes('backend') || title.includes('api')) return 'Backend';
          if (title.includes('data')) return 'Data';
          return null;
        }).filter(Boolean);
        
        if (activeProjects.length > 0) {
          summaryParts.push(`Currently working on ${activeProjects[0].title}${activeProjects.length > 1 ? ` and ${activeProjects.length - 1} other projects` : ''}`);
        }
      }
      
      // Knowledge sharing patterns
      if (recentPosts.length > 0 && topics.length > 0) {
        const topTopic = topics[0];
        const postFrequency = recentPosts.length > 10 ? 'frequently shares insights' : 'shares expertise';
        summaryParts.push(`${postFrequency} on ${topTopic}${topics.length > 1 ? ` and ${topics.slice(1, 3).join(', ')}` : ''}`);
      }
      
      // Collaboration network
      if (collaborators.length > 0) {
        const topCollaborator = collaborators[0];
        summaryParts.push(`Often collaborates with ${topCollaborator.name}${collaborators.length > 1 ? ` and ${collaborators.length - 1} others` : ''}`);
      }
      
      // Activity level - but only add if we have other info
      if (summaryParts.length > 0) {
        const activityLevel = insights.stats.totalPosts > 20 ? 'Highly active contributor' : 
                             insights.stats.totalPosts > 5 ? 'Regular contributor' : 
                             insights.stats.totalPosts > 0 ? 'Recent contributor' :
                             projects.length > 0 ? 'Project contributor' :
                             'Team member';
        summaryParts.push(activityLevel);
      }
      
      // If we have no data, build from basic profile info
      if (summaryParts.length === 0) {
        if (profile?.bio) {
          summaryParts.push(profile.bio.slice(0, 100) + (profile.bio.length > 100 ? '...' : ''));
        } else if (profile?.title) {
          summaryParts.push(`${profile.title} on the team`);
        } else {
          summaryParts.push('Team member');
        }
        
        // Add any available metadata
        if (profile?.location) {
          summaryParts.push(`Based in ${profile.location}`);
        }
        
        if (profile?.created_at) {
          const joinDate = new Date(profile.created_at);
          const monthsAgo = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          if (monthsAgo < 1) {
            summaryParts.push('Recently joined');
          } else if (monthsAgo < 12) {
            summaryParts.push(`Joined ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`);
          }
        }
      }
      
      const summary = summaryParts.join('. ') + '.';
      
      suggestions.push({
        id: 'profile-summary',
        type: 'insight',
        title: profile?.name || context.content || 'Team Member',
        description: summary,
        priority: 1
      });
      
    } else if (context.type === 'post') {
      // This is for posts - but since we're focusing on mention links, this may not be used
      // Still, let's improve it in case
      const author = insights.connections.author;
      const mentionedPeople = insights.connections.mentionedPeople || [];
      const mentionedProjects = insights.connections.mentionedProjects || [];
      const relatedPosts = insights.relatedContent.similar || [];
      
      const summaryParts: string[] = [];
      
      // Author context
      if (author) {
        summaryParts.push(`${author.name} (${author.title || 'Team member'})`);
      }
      
      // Collaboration context
      if (mentionedPeople.length > 0 || mentionedProjects.length > 0) {
        const context = [];
        if (mentionedProjects.length > 0) {
          context.push(`discussing ${mentionedProjects.map((p: any) => p.title).join(' and ')}`);
        }
        if (mentionedPeople.length > 0) {
          context.push(`collaborating with ${mentionedPeople.map((p: any) => p.name).join(' and ')}`);
        }
        summaryParts.push(context.join(', '));
      }
      
      // Conversation context
      if (relatedPosts.length > 0) {
        summaryParts.push(`Part of an ongoing discussion with ${relatedPosts.length} related posts`);
      }
      
      const summary = summaryParts.join('. ') + '.';
      
      suggestions.push({
        id: 'post-context',
        type: 'insight',
        title: 'Discussion Context',
        description: summary,
        priority: 1
      });
      
    } else if (context.type === 'project') {
      // Create a rich summary of the project
      const { data: project } = await supabase
        .from('projects')
        .select('title, description, status')
        .eq('id', context.id)
        .single();
        
      const team = insights.connections.team || [];
      const keyContributors = insights.connections.keyContributors || [];
      const recentActivity = insights.recentActivity || [];
      const status = project?.status || insights.stats.status || 'active';
      
      const summaryParts: string[] = [];
      
      // Project focus from description
      if (project?.description) {
        // Extract key themes
        const desc = project.description.toLowerCase();
        const themes = [];
        if (desc.includes('machine learning') || desc.includes('ml') || desc.includes('ai')) themes.push('AI/ML');
        if (desc.includes('frontend') || desc.includes('ui') || desc.includes('ux')) themes.push('Frontend');
        if (desc.includes('backend') || desc.includes('api') || desc.includes('server')) themes.push('Backend');
        if (desc.includes('data') || desc.includes('analytics')) themes.push('Data');
        if (desc.includes('mobile') || desc.includes('ios') || desc.includes('android')) themes.push('Mobile');
        
        if (themes.length > 0) {
          summaryParts.push(`${themes.join('/')} project`);
        }
      }
      
      // Team dynamics
      if (team.length > 0) {
        const roles = team.map((m: any) => m.role).filter(Boolean);
        const uniqueRoles = [...new Set(roles)];
        
        if (team.length === 1) {
          summaryParts.push(`Solo project by ${team[0].name}`);
        } else if (team.length <= 3) {
          summaryParts.push(`Small team of ${team.length} (${team.map((m: any) => m.name).join(', ')})`);
        } else {
          const departments = uniqueRoles.length > 2 ? 'cross-functional' : 'focused';
          summaryParts.push(`${team.length}-person ${departments} team`);
        }
        
        if (keyContributors.length > 0) {
          summaryParts.push(`Led by ${keyContributors.map((c: any) => c.name).join(' and ')}`);
        }
      }
      
      // Activity insights
      if (recentActivity.length > 0) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentPosts = recentActivity.filter((p: any) => new Date(p.created_at) > lastWeek);
        
        if (recentPosts.length > 5) {
          summaryParts.push('Very active with daily updates');
        } else if (recentPosts.length > 0) {
          summaryParts.push(`${recentPosts.length} updates this week`);
        } else if (status === 'active') {
          summaryParts.push('Steady progress');
        }
      }
      
      // Status context
      const statusContext = {
        'active': 'Currently in active development',
        'paused': 'Temporarily on hold',
        'complete': 'Successfully delivered'
      };
      summaryParts.push(statusContext[status] || 'In progress');
      
      const summary = summaryParts.join('. ') + '.';
      
      suggestions.push({
        id: 'project-summary',
        type: 'insight',
        title: project?.title || 'Project',
        description: summary,
        priority: 1
      });
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