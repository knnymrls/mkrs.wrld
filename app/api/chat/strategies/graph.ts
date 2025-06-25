import { SearchStrategy } from '@/app/types/chat';
import { SearchResult } from '@/app/models/Search';
import { Post } from '@/app/models/Post';
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
              } as any,
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
          posts!inner(
            id,
            content,
            created_at,
            author_id,
            image_url,
            image_width,
            image_height,
            profiles!author_id (
              id,
              name,
              avatar_url
            ),
            post_mentions (
              profile_id,
              profiles!profile_id (
                id,
                name,
                avatar_url
              )
            ),
            post_projects (
              project_id,
              projects!project_id (
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
          )
        `)
        .eq('project_id', entity.id)
        .limit(10);
      
      if (postMentions && remainingDepth > 1) {
        for (const mention of postMentions) {
          if (!results.find(r => r.type === 'post' && r.id === mention.post_id)) {
            // Transform the data to match the Post interface
            const postData = mention.posts as any;
            const formattedPost: Post = {
              id: postData.id,
              content: postData.content,
              created_at: postData.created_at,
              author: postData.profiles || { id: postData.author_id, name: 'Unknown', avatar_url: null },
              mentions: [
                ...(postData.post_mentions?.map((m: any) => ({
                  id: m.profiles?.id || m.profile_id,
                  name: m.profiles?.name || 'Unknown',
                  type: 'person' as const,
                  imageUrl: m.profiles?.avatar_url
                })) || []),
                ...(postData.post_projects?.map((p: any) => ({
                  id: p.projects?.id || p.project_id,
                  name: p.projects?.title || 'Unknown Project',
                  type: 'project' as const,
                  imageUrl: p.projects?.image_url
                })) || [])
              ],
              likes_count: postData.post_likes?.length || 0,
              comments_count: postData.post_comments?.length || 0,
              user_has_liked: false,
              image_url: postData.image_url,
              image_width: postData.image_width,
              image_height: postData.image_height,
              images: postData.post_images || []
            };
            
            results.push({
              type: 'post',
              id: mention.post_id,
              data: formattedPost,
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