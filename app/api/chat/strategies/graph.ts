import { SearchStrategy, SearchResult } from '../types';
import { createClient } from '@supabase/supabase-js';

const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class GraphTraversalStrategy implements SearchStrategy {
  name = 'graph';
  private supabase = defaultSupabase;

  setSupabaseClient(client: any) {
    this.supabase = client;
  }

  async execute(
    query: string, 
    params?: { 
      seedEntities: { type: string; id: string }[]; 
      depth?: number;
      relationTypes?: string[];
    }
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const visited = new Set<string>();
    const depth = params?.depth || 2;
    const seedEntities = params?.seedEntities || [];
    
    // Process each seed entity
    for (const seed of seedEntities) {
      await this.traverse(seed, depth, visited, results);
    }
    
    return results;
  }

  private async traverse(
    entity: { type: string; id: string },
    remainingDepth: number,
    visited: Set<string>,
    results: SearchResult[]
  ) {
    const key = `${entity.type}:${entity.id}`;
    if (visited.has(key) || remainingDepth <= 0) return;
    
    visited.add(key);
    
    if (entity.type === 'profile') {
      // Get all posts by this person
      const { data: posts } = await this.supabase
        .from('posts')
        .select('*')
        .eq('author_id', entity.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (posts) {
        for (const post of posts) {
          results.push({
            type: 'post',
            id: post.id,
            data: post,
            relevanceScore: 0.7,
            matchReason: `Posted by related person`,
          });
          
          // Get mentions from this post
          const { data: mentions } = await this.supabase
            .from('post_mentions')
            .select('profile_id')
            .eq('post_id', post.id);
          
          if (mentions && remainingDepth > 1) {
            for (const mention of mentions) {
              await this.traverse(
                { type: 'profile', id: mention.profile_id },
                remainingDepth - 1,
                visited,
                results
              );
            }
          }
          
          // Get projects linked to this post
          const { data: projectLinks } = await this.supabase
            .from('post_projects')
            .select('project_id')
            .eq('post_id', post.id);
          
          if (projectLinks && remainingDepth > 1) {
            for (const link of projectLinks) {
              await this.traverse(
                { type: 'project', id: link.project_id },
                remainingDepth - 1,
                visited,
                results
              );
            }
          }
        }
      }
      
      // Get projects this person contributes to
      const { data: contributions } = await this.supabase
        .from('contributions')
        .select('project_id, role, description')
        .eq('person_id', entity.id);
      
      if (contributions) {
        for (const contrib of contributions) {
          await this.traverse(
            { type: 'project', id: contrib.project_id },
            remainingDepth - 1,
            visited,
            results
          );
        }
      }
      
    } else if (entity.type === 'project') {
      // Get project details
      const { data: project } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', entity.id)
        .single();
      
      if (project && !results.find(r => r.type === 'project' && r.id === project.id)) {
        results.push({
          type: 'project',
          id: project.id,
          data: project,
          relevanceScore: 0.8,
          matchReason: 'Connected through graph traversal',
        });
      }
      
      // Get all contributors
      const { data: contributors } = await this.supabase
        .from('contributions')
        .select(`
          person_id,
          role,
          description,
          profiles!inner(id, name, title, bio)
        `)
        .eq('project_id', entity.id);
      
      if (contributors && remainingDepth > 1) {
        for (const contrib of contributors) {
          // Add the contributor profile
          if (!results.find(r => r.type === 'profile' && r.id === contrib.person_id)) {
            const { data: skills } = await this.supabase
              .from('skills')
              .select('skill')
              .eq('profile_id', contrib.person_id);
            
            results.push({
              type: 'profile',
              id: contrib.person_id,
              data: {
                ...contrib.profiles,
                skills: skills?.map(s => s.skill) || [],
                contributionRole: contrib.role,
                contributionDescription: contrib.description,
              },
              relevanceScore: 0.75,
              matchReason: `Contributes to related project as ${contrib.role}`,
            });
          }
          
          // Traverse to this person's other connections
          await this.traverse(
            { type: 'profile', id: contrib.person_id },
            remainingDepth - 1,
            visited,
            results
          );
        }
      }
      
      // Get posts mentioning this project
      const { data: postMentions } = await this.supabase
        .from('post_projects')
        .select(`
          post_id,
          posts!inner(id, content, created_at, author_id)
        `)
        .eq('project_id', entity.id)
        .limit(10);
      
      if (postMentions && remainingDepth > 1) {
        for (const mention of postMentions) {
          if (!results.find(r => r.type === 'post' && r.id === mention.post_id)) {
            results.push({
              type: 'post',
              id: mention.post_id,
              data: mention.posts,
              relevanceScore: 0.6,
              matchReason: 'Mentions related project',
            });
          }
          
          // Traverse to post author
          if (mention.posts && (mention.posts as any).author_id) {
            await this.traverse(
              { type: 'profile', id: (mention.posts as any).author_id },
              remainingDepth - 1,
              visited,
              results
            );
          }
        }
      }
      
    } else if (entity.type === 'post') {
      // Get post details
      const { data: post } = await this.supabase
        .from('posts')
        .select('*')
        .eq('id', entity.id)
        .single();
      
      if (post) {
        // Get the author
        await this.traverse(
          { type: 'profile', id: post.author_id },
          remainingDepth - 1,
          visited,
          results
        );
        
        // Get mentioned profiles
        const { data: mentions } = await this.supabase
          .from('post_mentions')
          .select('profile_id')
          .eq('post_id', entity.id);
        
        if (mentions && remainingDepth > 1) {
          for (const mention of mentions) {
            await this.traverse(
              { type: 'profile', id: mention.profile_id },
              remainingDepth - 1,
              visited,
              results
            );
          }
        }
        
        // Get mentioned projects
        const { data: projectMentions } = await this.supabase
          .from('post_projects')
          .select('project_id')
          .eq('post_id', entity.id);
        
        if (projectMentions && remainingDepth > 1) {
          for (const mention of projectMentions) {
            await this.traverse(
              { type: 'project', id: mention.project_id },
              remainingDepth - 1,
              visited,
              results
            );
          }
        }
      }
    }
  }
}