// scripts/regenerate-embeddings.ts
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
});

// Rate limiting: OpenAI allows 3000 RPM for text-embedding-3-small
const BATCH_SIZE = 20;
const DELAY_MS = 1000; // 1 second between batches

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

async function regenerateProfileEmbeddings() {
    console.log('\n🔄 Regenerating profile embeddings...');
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, bio, title, location');
    
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    
    console.log(`Found ${profiles?.length || 0} profiles to process`);
    
    for (let i = 0; i < (profiles || []).length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        
        for (const profile of batch) {
            try {
                // Fetch skills
                const { data: skills } = await supabase
                    .from('skills')
                    .select('skill')
                    .eq('profile_id', profile.id);
                
                // Fetch education
                const { data: education } = await supabase
                    .from('educations')
                    .select('school, degree')
                    .eq('profile_id', profile.id);
                
                // Fetch experience
                const { data: experience } = await supabase
                    .from('experiences')
                    .select('company, role, description')
                    .eq('profile_id', profile.id);
                
                // Create embedding text with improved experience descriptions
                const skillsText = skills ? skills.map(s => s.skill).join(', ') : '';
                const educationText = (education || [])
                    .map(e => `${e.degree} from ${e.school}`)
                    .join('. ');
                const experienceText = (experience || [])
                    .map(exp => {
                        const baseText = `${exp.role} at ${exp.company}`;
                        return exp.description ? `${baseText}: ${exp.description}` : baseText;
                    })
                    .join('. ');
                
                const embeddingText = `${profile.bio || ''} ${skillsText} ${profile.title || ''} ${profile.location || ''} ${educationText} ${experienceText}`;
                
                // Generate embedding
                const embedding = await getEmbedding(embeddingText);
                
                // Update profile
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ embedding })
                    .eq('id', profile.id);
                
                if (updateError) {
                    console.error(`Error updating profile ${profile.id}:`, updateError);
                } else {
                    console.log(`✅ Updated profile: ${profile.name}`);
                }
            } catch (error) {
                console.error(`Error processing profile ${profile.id}:`, error);
            }
        }
        
        if (i + BATCH_SIZE < profiles.length) {
            console.log(`Processed ${i + batch.length}/${profiles.length} profiles, waiting...`);
            await delay(DELAY_MS);
        }
    }
    
    console.log('✅ Profile embeddings regeneration complete!');
}

async function regeneratePostEmbeddings() {
    console.log('\n🔄 Regenerating post embeddings...');
    
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, content, author_id');
    
    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }
    
    console.log(`Found ${posts?.length || 0} posts to process`);
    
    for (let i = 0; i < (posts || []).length; i += BATCH_SIZE) {
        const batch = posts.slice(i, i + BATCH_SIZE);
        
        for (const post of batch) {
            try {
                // Generate embedding
                const embedding = await getEmbedding(post.content);
                
                // Update post
                const { error: updateError } = await supabase
                    .from('posts')
                    .update({ embedding })
                    .eq('id', post.id);
                
                if (updateError) {
                    console.error(`Error updating post ${post.id}:`, updateError);
                } else {
                    console.log(`✅ Updated post: ${post.content.substring(0, 50)}...`);
                }
            } catch (error) {
                console.error(`Error processing post ${post.id}:`, error);
            }
        }
        
        if (i + BATCH_SIZE < posts.length) {
            console.log(`Processed ${i + batch.length}/${posts.length} posts, waiting...`);
            await delay(DELAY_MS);
        }
    }
    
    console.log('✅ Post embeddings regeneration complete!');
}

async function regenerateProjectEmbeddings() {
    console.log('\n🔄 Regenerating project embeddings...');
    
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, description');
    
    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }
    
    console.log(`Found ${projects?.length || 0} projects to process`);
    
    for (let i = 0; i < (projects || []).length; i += BATCH_SIZE) {
        const batch = projects.slice(i, i + BATCH_SIZE);
        
        for (const project of batch) {
            try {
                // Create embedding text
                const embeddingText = `${project.title} ${project.description || ''}`.trim();
                
                // Generate embedding
                const embedding = await getEmbedding(embeddingText);
                
                // Update project
                const { error: updateError } = await supabase
                    .from('projects')
                    .update({ embedding })
                    .eq('id', project.id);
                
                if (updateError) {
                    console.error(`Error updating project ${project.id}:`, updateError);
                } else {
                    console.log(`✅ Updated project: ${project.title}`);
                }
            } catch (error) {
                console.error(`Error processing project ${project.id}:`, error);
            }
        }
        
        if (i + BATCH_SIZE < projects.length) {
            console.log(`Processed ${i + batch.length}/${projects.length} projects, waiting...`);
            await delay(DELAY_MS);
        }
    }
    
    console.log('✅ Project embeddings regeneration complete!');
}

async function main() {
    console.log('🚀 Starting embedding regeneration with text-embedding-3-small...');
    console.log('⚠️  This will update ALL embeddings in the database!');
    console.log('Press Ctrl+C to cancel within 5 seconds...\n');
    
    await delay(5000);
    
    const startTime = Date.now();
    
    try {
        await regenerateProfileEmbeddings();
        await regeneratePostEmbeddings();
        await regenerateProjectEmbeddings();
        
        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
        console.log(`\n✨ All embeddings regenerated successfully in ${duration} minutes!`);
    } catch (error) {
        console.error('\n❌ Error during regeneration:', error);
        process.exit(1);
    }
}

// Run the script
main().catch(console.error);