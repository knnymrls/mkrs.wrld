import { SearchStrategy, SearchResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { EntityExpander } from '../utils/entity-expander';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class KeywordSearchStrategy implements SearchStrategy {
  name = 'keyword';
  private expander = new EntityExpander();

  async execute(query: string, params?: { keywords?: string[]; expandTerms?: boolean }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Extract keywords from query or use provided ones
    let keywords = params?.keywords || this.extractKeywords(query);
    
    // Expand keywords if requested
    if (params?.expandTerms !== false) {
      const expandedKeywords = new Set<string>();
      for (const keyword of keywords) {
        const expanded = await this.expander.getAllSearchTerms(keyword);
        expanded.forEach(term => expandedKeywords.add(term.toLowerCase()));
      }
      keywords = Array.from(expandedKeywords);
    }
    
    if (keywords.length === 0) return results;
    
    // Build OR conditions for each keyword
    const orConditions = keywords.map(k => `%${k}%`);
    
    // Search profiles
    const profileConditions = keywords.flatMap(k => [
      `title.ilike.%${k}%`,
      `bio.ilike.%${k}%`,
      `name.ilike.%${k}%`,
    ]).join(',');
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or(profileConditions)
      .limit(20);
    
    if (profiles) {
      for (const profile of profiles) {
        // Fetch related data
        const { data: skills } = await supabase
          .from('skills')
          .select('skill')
          .eq('profile_id', profile.id);
        
        const { data: experiences } = await supabase
          .from('experiences')
          .select('*')
          .eq('profile_id', profile.id);
        
        // Calculate relevance based on how many keywords match
        const matchedKeywords = keywords.filter(k => 
          profile.title?.toLowerCase().includes(k) ||
          profile.bio?.toLowerCase().includes(k) ||
          profile.name?.toLowerCase().includes(k) ||
          skills?.some(s => s.skill.toLowerCase().includes(k))
        );
        
        results.push({
          type: 'profile',
          id: profile.id,
          data: {
            ...profile,
            skills: skills?.map(s => s.skill) || [],
            experiences: experiences || [],
          },
          relevanceScore: matchedKeywords.length / keywords.length,
          matchReason: `Matches keywords: ${matchedKeywords.join(', ')}`,
        });
      }
    }
    
    // Search experiences
    const experienceConditions = keywords.flatMap(k => [
      `role.ilike.%${k}%`,
      `description.ilike.%${k}%`,
      `company.ilike.%${k}%`,
    ]).join(',');
    
    const { data: experiences } = await supabase
      .from('experiences')
      .select(`
        *,
        profiles!inner(id, name, title, bio, email, location)
      `)
      .or(experienceConditions)
      .limit(20);
    
    if (experiences) {
      for (const exp of experiences) {
        const profile = exp.profiles;
        
        // Fetch skills for the profile
        const { data: skills } = await supabase
          .from('skills')
          .select('skill')
          .eq('profile_id', profile.id);
        
        results.push({
          type: 'experience',
          id: exp.id,
          data: {
            ...exp,
            profile: {
              ...profile,
              skills: skills?.map(s => s.skill) || [],
            },
          },
          relevanceScore: 0.8,
          matchReason: `Experience matches: ${keywords.filter(k => 
            exp.role?.toLowerCase().includes(k) ||
            exp.description?.toLowerCase().includes(k)
          ).join(', ')}`,
        });
      }
    }
    
    // Search skills
    const skillConditions = keywords.map(k => `skill.ilike.%${k}%`).join(',');
    
    const { data: skills } = await supabase
      .from('skills')
      .select(`
        *,
        profiles!inner(id, name, title, bio, email, location)
      `)
      .or(skillConditions)
      .limit(30);
    
    if (skills) {
      // Group by profile to avoid duplicates
      const profileMap = new Map();
      
      for (const skill of skills) {
        const profileId = skill.profile_id;
        if (!profileMap.has(profileId)) {
          profileMap.set(profileId, {
            profile: skill.profiles,
            matchedSkills: [],
          });
        }
        profileMap.get(profileId).matchedSkills.push(skill.skill);
      }
      
      // Convert to results
      for (const [profileId, data] of profileMap) {
        // Fetch all skills and experiences for this profile
        const { data: allSkills } = await supabase
          .from('skills')
          .select('skill')
          .eq('profile_id', profileId);
        
        const { data: experiences } = await supabase
          .from('experiences')
          .select('*')
          .eq('profile_id', profileId);
        
        results.push({
          type: 'profile',
          id: profileId,
          data: {
            ...data.profile,
            skills: allSkills?.map(s => s.skill) || [],
            experiences: experiences || [],
          },
          relevanceScore: 0.9,
          matchReason: `Has skills: ${data.matchedSkills.join(', ')}`,
        });
      }
    }
    
    // Search posts
    const postConditions = keywords.map(k => `content.ilike.%${k}%`).join(',');
    
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .or(postConditions)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (posts) {
      for (const post of posts) {
        const matchedKeywords = keywords.filter(k => 
          post.content.toLowerCase().includes(k)
        );
        
        results.push({
          type: 'post',
          id: post.id,
          data: post,
          relevanceScore: matchedKeywords.length / keywords.length,
          matchReason: `Post mentions: ${matchedKeywords.join(', ')}`,
        });
      }
    }
    
    // Search projects
    const projectConditions = keywords.flatMap(k => [
      `title.ilike.%${k}%`,
      `description.ilike.%${k}%`,
    ]).join(',');
    
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .or(projectConditions)
      .limit(20);
    
    if (projects) {
      for (const project of projects) {
        const matchedKeywords = keywords.filter(k => 
          project.title?.toLowerCase().includes(k) ||
          project.description?.toLowerCase().includes(k)
        );
        
        results.push({
          type: 'project',
          id: project.id,
          data: project,
          relevanceScore: matchedKeywords.length / keywords.length,
          matchReason: `Project involves: ${matchedKeywords.join(', ')}`,
        });
      }
    }
    
    return results;
  }

  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'who', 'what', 'where', 'when', 'how', 'why', 'would', 'could',
      'should', 'be', 'best', 'find', 'show', 'tell', 'me', 'us',
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}