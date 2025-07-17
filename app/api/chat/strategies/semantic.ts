import { SearchStrategy } from '@/app/types/chat';
import { SearchResult } from '@/app/models/Search';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class SemanticSearchStrategy implements SearchStrategy {
  name = 'semantic';
  private supabase = defaultSupabase;

  setSupabaseClient(client: any) {
    this.supabase = client;
  }

  async execute(query: string, params?: { limit?: number; searchAll?: boolean }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Generate embedding for the query
    const openai = getOpenAIClient();
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingRes.data[0].embedding;
    const limit = params?.limit || 20;

    // Search profiles
    const { data: profiles } = await this.supabase.rpc('match_profiles', {
      query_embedding: embedding,
      match_threshold: -1, // Due to pgvector issue
      match_count: limit,
    });

    if (profiles) {
      for (const profile of profiles) {
        // Fetch additional data
        const { data: skills } = await this.supabase
          .from('skills')
          .select('skill')
          .eq('profile_id', profile.id);

        const { data: experiences } = await this.supabase
          .from('experiences')
          .select('*')
          .eq('profile_id', profile.id);

        const { data: educations } = await this.supabase
          .from('educations')
          .select('*')
          .eq('profile_id', profile.id);

        results.push({
          type: 'profile',
          id: profile.id,
          data: {
            ...profile,
            skills: skills?.map(s => s.skill) || [],
            experiences: experiences || [],
            educations: educations || [],
          },
          relevanceScore: profile.similarity || 0,
          matchReason: 'Semantic similarity to query',
        });
      }
    }

    // Search posts
    const { data: posts } = await this.supabase.rpc('match_posts', {
      query_embedding: embedding,
      match_threshold: -1,
      match_count: limit,
    });

    if (posts) {
      for (const post of posts) {
        results.push({
          type: 'post',
          id: post.id,
          data: post,
          relevanceScore: post.similarity || 0,
          matchReason: 'Content matches query semantically',
        });
      }
    }

    // Search projects
    const { data: projects } = await this.supabase.rpc('match_projects', {
      query_embedding: embedding,
      match_threshold: -1,
      match_count: limit,
    });

    if (projects) {
      for (const project of projects) {
        // Fetch contributors
        const { data: contributions } = await this.supabase
          .from('contributions')
          .select('person_id, role, description')
          .eq('project_id', project.id);

        results.push({
          type: 'project',
          id: project.id,
          data: {
            ...project,
            contributions: contributions || [],
          },
          relevanceScore: project.similarity || 0,
          matchReason: 'Project description matches query',
        });
      }
    }

    // Search project requests
    const { data: projectRequests } = await this.supabase.rpc('match_project_requests', {
      query_embedding: embedding,
      match_threshold: -1,
      match_count: limit,
    });

    if (projectRequests) {
      for (const request of projectRequests) {
        // Fetch creator info
        const { data: creator } = await this.supabase
          .from('profiles')
          .select('id, name, title')
          .eq('id', request.created_by)
          .single();

        results.push({
          type: 'project_request',
          id: request.id,
          data: {
            ...request,
            creator,
          },
          relevanceScore: request.similarity || 0,
          matchReason: 'Project request matches query',
        });
      }
    }

    return results;
  }
}