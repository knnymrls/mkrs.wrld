// lib/embedding.ts
import { OpenAI } from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function getEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    });
    return response.data[0].embedding;
}

export async function updateProjectEmbedding(projectId: string): Promise<void> {
    try {
        // Fetch the project
        const { data: project, error } = await supabase
            .from('projects')
            .select('title, description')
            .eq('id', projectId)
            .single();

        if (error || !project) {
            throw new Error('Project not found');
        }

        // Create embedding text from project data
        const embeddingText = `${project.title} ${project.description || ''}`.trim();
        
        // Generate embedding
        const embedding = await getEmbedding(embeddingText);

        // Update the project with the new embedding
        const { error: updateError } = await supabase
            .from('projects')
            .update({ embedding })
            .eq('id', projectId);

        if (updateError) {
            throw updateError;
        }
    } catch (error) {
        console.error('Error updating project embedding:', error);
        throw error;
    }
}

export async function updateProfileEmbedding(profileId: string): Promise<void> {
    try {
        // Fetch profile with related data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, bio, title, location')
            .eq('id', profileId)
            .single();

        if (profileError || !profile) {
            throw new Error('Profile not found');
        }

        // Fetch skills
        const { data: skills } = await supabase
            .from('skills')
            .select('skill')
            .eq('profile_id', profileId);

        // Fetch education
        const { data: education } = await supabase
            .from('educations')
            .select('school, degree')
            .eq('profile_id', profileId);

        // Fetch experience
        const { data: experience } = await supabase
            .from('experiences')
            .select('company, role, description')
            .eq('profile_id', profileId);

        // Create embedding text from all profile data
        const embeddingText = [
            profile.name,
            profile.bio,
            profile.title,
            profile.location,
            ...(skills || []).map(s => s.skill),
            ...(education || []).map(e => `${e.school} ${e.degree}`),
            ...(experience || []).map(e => `${e.company} ${e.role} ${e.description || ''}`)
        ].filter(Boolean).join(' ');

        // Generate embedding
        const embedding = await getEmbedding(embeddingText);

        // Update the profile with the new embedding
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ embedding })
            .eq('id', profileId);

        if (updateError) {
            throw updateError;
        }
    } catch (error) {
        console.error('Error updating profile embedding:', error);
        throw error;
    }
}