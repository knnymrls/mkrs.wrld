import { supabase } from './supabase';
import { getEmbedding } from './embeddings';
import { Profile } from '@/app/models/Profile';
import { Education } from '@/app/models/Education';
import { Experience } from '@/app/models/Experience';

export async function updateProfileEmbedding(userId: string) {
    try {
        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            throw new Error('Failed to fetch profile');
        }

        // Fetch educations
        const { data: educations, error: educationError } = await supabase
            .from('educations')
            .select('*')
            .eq('profile_id', userId);

        if (educationError) {
            console.error('Error fetching educations:', educationError);
        }

        // Fetch experiences
        const { data: experiences, error: experienceError } = await supabase
            .from('experiences')
            .select('*')
            .eq('profile_id', userId);

        if (experienceError) {
            console.error('Error fetching experiences:', experienceError);
        }

        // Fetch skills
        const { data: skills, error: skillsError } = await supabase
            .from('skills')
            .select('skill')
            .eq('profile_id', userId);

        if (skillsError) {
            console.error('Error fetching skills:', skillsError);
        }

        // Build comprehensive embedding text
        const skillsText = skills ? skills.map(s => s.skill).join(', ') : '';
        const educationText = (educations || [])
            .map((edu: Education) => `${edu.degree} from ${edu.school}`)
            .join('. ');
        const experienceText = (experiences || [])
            .map((exp: Experience) => `${exp.role} at ${exp.company}`)
            .join('. ');

        const embeddingInput = `${profile.bio || ''} ${skillsText} ${profile.title || ''} ${profile.location || ''} ${educationText} ${experienceText}`;
        
        // Generate new embedding
        const embedding = await getEmbedding(embeddingInput);

        // Update profile with new embedding
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ embedding })
            .eq('id', userId);

        if (updateError) {
            throw new Error('Failed to update profile embedding');
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating profile embedding:', error);
        return { success: false, error };
    }
}