import { supabase } from './client';

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
}

export async function uploadProjectImage(projectId: string, file: File): Promise<string | null> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading project image:', error);
    return null;
  }
}

export async function deleteAvatar(avatarUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const url = new URL(avatarUrl);
    const filePath = url.pathname.split('/').slice(-2).join('/');

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
}

export async function deleteProjectImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const url = new URL(imageUrl);
    const filePath = url.pathname.split('/').slice(-2).join('/');

    const { error } = await supabase.storage
      .from('project-images')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting project image:', error);
    return false;
  }
}