// app/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// In-memory chat history store (in production, you'd want to use a database)
const chatHistories = new Map<string, ChatCompletionMessageParam[]>();

interface TrackedMention {
    id: string;
    name: string;
    type: 'person' | 'project';
    start: number;
    end: number;
}

export async function POST(req: NextRequest) {
    try {
        const { message, sessionId, mentions = [] } = await req.json() as { 
            message: string; 
            sessionId: string; 
            mentions?: TrackedMention[] 
        };

        // Get or initialize chat history for this session
        if (!chatHistories.has(sessionId)) {
            chatHistories.set(sessionId, []);
        }
        const chatHistory = chatHistories.get(sessionId)!;

        // 1. Embed the input
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: message,
        });

        const embedding = embeddingRes.data[0].embedding;

        // 2. Semantic search across posts, profiles, and projects
        // Using -1 threshold due to Supabase vector storage limitations
        const { data: postChunks, error: postSearchError } = await supabase.rpc('match_posts', {
            query_embedding: embedding,
            match_threshold: -1,
            match_count: 20,
        });

        const { data: profileChunks, error: profileSearchError } = await supabase.rpc('match_profiles', {
            query_embedding: embedding,
            match_threshold: -1,
            match_count: 20,
        });

        const { data: projectChunks, error: projectSearchError } = await supabase.rpc('match_projects', {
            query_embedding: embedding,
            match_threshold: -1,
            match_count: 20,
        });

        // Fetch mentioned entities directly if any
        let mentionedProfiles: any[] = [];
        let mentionedProjects: any[] = [];
        
        if (mentions.length > 0) {
            // Fetch mentioned profiles
            const mentionedProfileIds = mentions
                .filter(m => m.type === 'person')
                .map(m => m.id);
            
            if (mentionedProfileIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, bio, email, location, title')
                    .in('id', mentionedProfileIds);
                
                if (profiles) {
                    // Fetch skills for mentioned profiles
                    for (const profile of profiles) {
                        const { data: skills } = await supabase
                            .from('skills')
                            .select('skill')
                            .eq('profile_id', profile.id);
                        mentionedProfiles.push({
                            ...profile,
                            skills: skills?.map(s => s.skill) || []
                        });
                    }
                }
            }
            
            // Fetch mentioned projects
            const mentionedProjectIds = mentions
                .filter(m => m.type === 'project')
                .map(m => m.id);
            
            if (mentionedProjectIds.length > 0) {
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, title, description, status, created_by')
                    .in('id', mentionedProjectIds);
                
                if (projects) {
                    mentionedProjects.push(...projects);
                }
            }
        }

        // Fetch skills for profileChunks
        const profilesWithSkills = [];
        for (const profile of profileChunks || []) {
            const { data: skills } = await supabase
                .from('skills')
                .select('skill')
                .eq('profile_id', profile.id);
            profilesWithSkills.push({
                ...profile,
                skills: skills?.map(s => s.skill) || []
            });
        }

        // --- Enhanced Graph-aware retrieval ---
        // 1. For each profile, fetch all their posts
        let allProfilePosts = [];
        for (const profile of profilesWithSkills) {
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, created_at, author_id')
                .eq('author_id', profile.id);
            if (posts) {
                allProfilePosts.push(...posts.map((p: any) => ({ ...p, author_name: profile.name })));
            }
        }

        // 2. For each post, fetch the author profile if not already included
        let allPostAuthors = [];
        for (const post of postChunks || []) {
            if (!profilesWithSkills.find((p: any) => p.id === post.author_id)) {
                const { data: author } = await supabase
                    .from('profiles')
                    .select('id, name, bio, email, location, title')
                    .eq('id', post.author_id)
                    .single();
                if (author) {
                    // Fetch skills separately
                    const { data: skills } = await supabase
                        .from('skills')
                        .select('skill')
                        .eq('profile_id', author.id);
                    allPostAuthors.push({
                        ...author,
                        skills: skills?.map(s => s.skill) || []
                    });
                }
            }
        }

        // 3. For each project, fetch contributors and their profiles
        let projectContributors = new Map<string, any[]>(); // Map project_id to array of contributors
        let contributorProfiles: any[] = [];
        for (const project of projectChunks || []) {
            const { data: contributions } = await supabase
                .from('contributions')
                .select('person_id, role, start_date, end_date, description')
                .eq('project_id', project.id);
            
            if (contributions) {
                projectContributors.set(project.id, contributions);
                for (const contrib of contributions) {
                    // Fetch the contributor's profile if not already included
                    if (!profilesWithSkills.find((p: any) => p.id === contrib.person_id) &&
                        !allPostAuthors.find((p: any) => p.id === contrib.person_id) &&
                        !contributorProfiles.find((p: any) => p.id === contrib.person_id)) {
                        const { data: contributor } = await supabase
                            .from('profiles')
                            .select('id, name, bio, email, location, title')
                            .eq('id', contrib.person_id)
                            .single();
                        if (contributor) {
                            const { data: skills } = await supabase
                                .from('skills')
                                .select('skill')
                                .eq('profile_id', contributor.id);
                            contributorProfiles.push({
                                ...contributor,
                                skills: skills?.map(s => s.skill) || []
                            });
                        }
                    }
                }
            }
        }

        // 4. Use junction tables for deeper connections
        // 4a. For each post, check mentions and project links
        let postMentionedProfiles: any[] = [];
        let linkedProjects: any[] = [];
        for (const post of [...(postChunks || []), ...allProfilePosts]) {
            // Get mentioned profiles
            const { data: mentions } = await supabase
                .from('post_mentions')
                .select('profile_id')
                .eq('post_id', post.id);
            
            if (mentions) {
                for (const mention of mentions) {
                    if (!profilesWithSkills.find((p: any) => p.id === mention.profile_id) &&
                        !allPostAuthors.find((p: any) => p.id === mention.profile_id) &&
                        !contributorProfiles.find((p: any) => p.id === mention.profile_id) &&
                        !postMentionedProfiles.find((p: any) => p.id === mention.profile_id)) {
                        const { data: mentionedProfile } = await supabase
                            .from('profiles')
                            .select('id, name, bio, email, location, title')
                            .eq('id', mention.profile_id)
                            .single();
                        if (mentionedProfile) {
                            const { data: skills } = await supabase
                                .from('skills')
                                .select('skill')
                                .eq('profile_id', mentionedProfile.id);
                            postMentionedProfiles.push({
                                ...mentionedProfile,
                                skills: skills?.map(s => s.skill) || []
                            });
                        }
                    }
                }
            }

            // Get linked projects
            const { data: projectLinks } = await supabase
                .from('post_projects')
                .select('project_id')
                .eq('post_id', post.id);
            
            if (projectLinks) {
                for (const link of projectLinks) {
                    if (!projectChunks?.find((p: any) => p.id === link.project_id) &&
                        !linkedProjects.find((p: any) => p.id === link.project_id)) {
                        const { data: linkedProject } = await supabase
                            .from('projects')
                            .select('id, title, description, status, created_by')
                            .eq('id', link.project_id)
                            .single();
                        if (linkedProject) {
                            linkedProjects.push(linkedProject);
                            
                            // Also fetch contributors for this linked project
                            const { data: contributions } = await supabase
                                .from('contributions')
                                .select('person_id, role, start_date, end_date, description')
                                .eq('project_id', linkedProject.id);
                            
                            if (contributions) {
                                projectContributors.set(linkedProject.id, contributions);
                                // Fetch contributor profiles if needed
                                for (const contrib of contributions) {
                                    if (!profilesWithSkills.find((p: any) => p.id === contrib.person_id) &&
                                        !allPostAuthors.find((p: any) => p.id === contrib.person_id) &&
                                        !contributorProfiles.find((p: any) => p.id === contrib.person_id) &&
                                        !postMentionedProfiles.find((p: any) => p.id === contrib.person_id)) {
                                        const { data: contributor } = await supabase
                                            .from('profiles')
                                            .select('id, name, bio, email, location, title')
                                            .eq('id', contrib.person_id)
                                            .single();
                                        if (contributor) {
                                            const { data: skills } = await supabase
                                                .from('skills')
                                                .select('skill')
                                                .eq('profile_id', contributor.id);
                                            contributorProfiles.push({
                                                ...contributor,
                                                skills: skills?.map(s => s.skill) || []
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Multi-hop: For newly discovered profiles, fetch their recent posts
        let secondHopPosts: any[] = [];
        const newlyDiscoveredProfiles = [...contributorProfiles, ...postMentionedProfiles];
        for (const profile of newlyDiscoveredProfiles) {
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, created_at, author_id')
                .eq('author_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(5); // Limit to 5 most recent posts per profile
            if (posts) {
                secondHopPosts.push(...posts.map((p: any) => ({ ...p, author_name: profile.name })));
            }
        }

        // 6. Merge and deduplicate all data
        // Merge posts: postChunks + allProfilePosts + secondHopPosts (dedupe by id)
        const allPostsMap = new Map();
        for (const p of [...(postChunks || []), ...allProfilePosts, ...secondHopPosts]) {
            allPostsMap.set(p.id, p);
        }
        const allPosts = Array.from(allPostsMap.values());

        // Merge profiles: mentionedProfiles first (priority), then profilesWithSkills + allPostAuthors + contributorProfiles + mentionedProfiles (dedupe by id)
        const allProfilesMap = new Map();
        // Add mentioned profiles first so they take priority
        for (const p of mentionedProfiles) {
            allProfilesMap.set(p.id, p);
        }
        // Then add other profiles
        for (const p of [...profilesWithSkills, ...allPostAuthors, ...contributorProfiles, ...postMentionedProfiles]) {
            if (!allProfilesMap.has(p.id)) {
                allProfilesMap.set(p.id, p);
            }
        }
        const allProfiles = Array.from(allProfilesMap.values());

        // Merge projects: mentionedProjects first (priority), then projectChunks + linkedProjects (dedupe by id)
        const allProjectsMap = new Map();
        // Add mentioned projects first so they take priority
        for (const p of mentionedProjects) {
            allProjectsMap.set(p.id, p);
        }
        // Then add other projects
        for (const p of [...(projectChunks || []), ...linkedProjects]) {
            if (!allProjectsMap.has(p.id)) {
                allProjectsMap.set(p.id, p);
            }
        }
        const allProjects = Array.from(allProjectsMap.values());

        // 7. Build enhanced context with all entity types
        const postContext = allPosts.map((c: any) => {
            const author = allProfiles.find((p: any) => p.id === c.author_id);
            return `Post by ${c.author_name || author?.name || 'Unknown'} (${new Date(c.created_at).toLocaleDateString()}): ${c.content.trim()}`;
        }).join('\n\n');

        const profileContext = allProfiles.map((c: any) => {
            return `Profile: ${c.name || 'Unnamed'} - ${c.title || 'No title'} - ${c.location || 'No location'} - ${c.bio || 'No bio'} - Skills: ${(c.skills || []).join(', ')} - Email: ${c.email || 'Not provided'}`;
        }).join('\n\n');

        const projectContext = allProjects.map((p: any) => {
            // Get contributors for this project
            const contributions = projectContributors.get(p.id) || [];
            const contributorNames = contributions.map((contrib: any) => {
                const profile = allProfiles.find((prof: any) => prof.id === contrib.person_id);
                return profile ? `${profile.name} (${contrib.role})` : 'Unknown contributor';
            }).join(', ') || 'No contributors found';
            return `Project: "${p.title}" - Status: ${p.status} - Description: ${p.description} - Contributors: ${contributorNames}`;
        }).join('\n\n');

        // Add mention context if any
        let mentionContext = '';
        if (mentions.length > 0) {
            const mentionedNames = mentions.map(m => m.name).join(', ');
            mentionContext = `The user specifically mentioned: ${mentionedNames}\n\n`;
        }

        const context = mentionContext + [postContext, profileContext, projectContext].filter(Boolean).join('\n\n');

        if (!context || context === mentionContext) {
            return NextResponse.json({
                answer: "I couldn't find any information in the database to answer your question.",
            });
        }

        // 3. Generate answer with context
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `
                You are a helpful, professional assistant for a company. Your main job is to help directors and employees quickly find relevant, factual, and actionable information about people and their work, skills, and contributions.
                
                CRITICAL RULES - READ CAREFULLY:
                1. ONLY use information that is EXPLICITLY present in the context below. Never make assumptions or infer information that isn't directly stated.
                2. If you're asked about someone and their name is not in the context, ALWAYS respond with: "I couldn't find any information about that person in the database."
                3. If you're asked about someone's location, title, skills, or posts and that information is not in the context, ALWAYS respond with: "I don't have that information in the database."
                4. NEVER make up or hallucinate information about people, their posts, or their locations.
                5. NEVER try to be helpful by making assumptions or filling in gaps in information.
                6. If the context is empty or no relevant information is found, ALWAYS respond with: "I couldn't find any relevant information in the database to answer your question."
                7. When discussing a person, ONLY use their exact name as it appears in the context. If you can't find their name in the context, don't make up a name.
                8. When referring to people, use gender-neutral language (they/them) unless their pronouns are explicitly stated in their profile.
                9. If someone uses specific pronouns in their profile or posts, respect and use those pronouns.
                10. NEVER combine information from different people or make assumptions about relationships between people.
                
                Your responses should ONLY contain information that is explicitly present in the context.
                If you're not 100% certain about something, say "I don't have that information in the database."
                Do not try to be helpful by making up information or making assumptions.
                `
            },
            ...chatHistory,  // Include chat history
            {
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${message}`,
            },
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
        });

        const answer = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";

        // Update chat history
        chatHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: answer }
        );

        // Keep only last 10 messages to prevent context window issues
        if (chatHistory.length > 10) {
            chatHistory.splice(0, chatHistory.length - 10);
        }

        return NextResponse.json({ answer });
    } catch (err: any) {
        console.error('Chat error:', err.message);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
