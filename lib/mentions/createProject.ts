import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';

export async function createProjectFromMention(
  projectName: string,
  userId: string | undefined
): Promise<{ id: string; title: string } | null> {
  if (!userId) return null;

  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      title: projectName,
      description: '',
      status: 'active',
      created_by: userId,
      embedding: await getEmbedding(projectName)
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  // Add creator as contributor
  await supabase
    .from('contributions')
    .insert({
      person_id: userId,
      project_id: newProject.id,
      role: 'Creator',
      start_date: new Date().toISOString()
    });

  return newProject;
}