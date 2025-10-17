import { supabase } from '@/lib/supabase/client';
import { MentionSuggestion } from '@/app/types/mention';

export async function searchMentions(search: string, showCreateOption: boolean = true): Promise<MentionSuggestion[]> {
  // Remove @ symbol if present in search query
  const cleanSearch = search.startsWith('@') ? search.slice(1) : search;

  // Search both profiles and projects in parallel
  const [profilesResult, projectsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, title, avatar_url')
      .not('name', 'is', null)
      .ilike('name', `%${cleanSearch}%`)
      .limit(10), // Get more initially, we'll limit to 5 total later
    supabase
      .from('projects')
      .select('id, title, status, image_url, icon')
      .ilike('title', `%${cleanSearch}%`)
      .limit(10) // Get more initially, we'll limit to 5 total later
  ]);

  const suggestions: MentionSuggestion[] = [];

  // Add profiles
  if (profilesResult.data) {
    suggestions.push(...profilesResult.data
      .filter(p => p.name) // Extra filter to ensure name exists
      .map(p => ({
        id: p.id,
        name: p.name,
        type: 'person' as const,
        subtitle: p.title,
        imageUrl: p.avatar_url
      })));
  }

  // Add projects
  if (projectsResult.data) {
    suggestions.push(...projectsResult.data.map(p => ({
      id: p.id,
      name: p.title,
      type: 'project' as const,
      subtitle: p.status,
      imageUrl: p.image_url,
      icon: p.icon
    })));
  }

  // Limit to 5 total results (people + projects combined)
  const limitedSuggestions = suggestions.slice(0, 5);

  // Add "Create new project" option if search has value and no exact match
  if (showCreateOption && search.trim() && !limitedSuggestions.find(s => s.name.toLowerCase() === cleanSearch.toLowerCase() && s.type === 'project')) {
    // If we already have 5 results, replace the last one with create option
    if (limitedSuggestions.length >= 5) {
      limitedSuggestions[4] = {
        id: 'create-new',
        name: cleanSearch,
        type: 'project',
        subtitle: 'Create new project'
      };
    } else {
      limitedSuggestions.push({
        id: 'create-new',
        name: cleanSearch,
        type: 'project',
        subtitle: 'Create new project'
      });
    }
  }

  return limitedSuggestions;
}