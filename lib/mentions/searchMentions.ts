import { supabase } from '@/lib/supabase';
import { MentionSuggestion } from '@/app/types/mention';

export async function searchMentions(search: string, showCreateOption: boolean = true): Promise<MentionSuggestion[]> {
  const suggestions: MentionSuggestion[] = [];

  // Search profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, title, avatar_url')
    .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    .limit(5);

  if (profiles) {
    suggestions.push(...profiles.map(p => ({
      id: p.id,
      name: p.name || 'Unknown',
      type: 'person' as const,
      subtitle: p.title,
      imageUrl: p.avatar_url
    })));
  }

  // Search projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, image_url')
    .ilike('title', `%${search}%`)
    .limit(5);

  if (projects) {
    suggestions.push(...projects.map(p => ({
      id: p.id,
      name: p.title,
      type: 'project' as const,
      subtitle: p.status,
      imageUrl: p.image_url
    })));
  }

  // Add "Create new project" option if search has value and no exact match
  if (showCreateOption && search.trim() && !suggestions.find(s => s.name.toLowerCase() === search.toLowerCase() && s.type === 'project')) {
    suggestions.push({
      id: 'create-new',
      name: search,
      type: 'project',
      subtitle: 'Create new project'
    });
  }

  return suggestions;
}