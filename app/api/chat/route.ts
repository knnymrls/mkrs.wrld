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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// In-memory chat history store (in production, you'd want to use a database)
const chatHistories = new Map<string, ChatCompletionMessageParam[]>();

export async function POST(req: NextRequest) {
    try {
        const { message, sessionId } = await req.json();

        // Get or initialize chat history for this session
        if (!chatHistories.has(sessionId)) {
            chatHistories.set(sessionId, []);
        }
        const chatHistory = chatHistories.get(sessionId)!;

        // 1. Embed the input
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: message,
        });

        const embedding = embeddingRes.data[0].embedding;

        // 2. Semantic search in both posts and profiles
        const { data: postChunks, error: postSearchError } = await supabase.rpc('match_posts', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 20,
        });

        const { data: profileChunks, error: profileSearchError } = await supabase.rpc('match_profiles', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 20,
        });

        // Add debug logging
        console.log('Search results:', {
            postChunks: postChunks || [],
            profileChunks: profileChunks || [],
            postSearchError,
            profileSearchError
        });

        // --- Graph-aware retrieval ---
        // 1. For each profile, fetch all their posts
        let allProfilePosts = [];
        for (const profile of profileChunks || []) {
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, created_at, profile_id')
                .eq('profile_id', profile.id);
            if (posts) {
                allProfilePosts.push(...posts.map((p: any) => ({ ...p, author_name: profile.full_name })));
            }
        }

        // 2. For each post, fetch the author profile if not already included
        let allPostAuthors = [];
        for (const post of postChunks || []) {
            if (!(profileChunks || []).find((p: any) => p.id === post.profile_id)) {
                const { data: author } = await supabase
                    .from('profiles')
                    .select('id, full_name, bio, skills, email, location, title')
                    .eq('id', post.profile_id)
                    .single();
                if (author) allPostAuthors.push(author);
            }
        }

        // 3. Merge and deduplicate
        // Merge posts: postChunks + allProfilePosts (dedupe by id)
        const allPostsMap = new Map();
        for (const p of [...(postChunks || []), ...allProfilePosts]) {
            allPostsMap.set(p.id, p);
        }
        const allPosts = Array.from(allPostsMap.values());

        // Merge profiles: profileChunks + allPostAuthors (dedupe by id)
        const allProfilesMap = new Map();
        for (const p of [...(profileChunks || []), ...allPostAuthors]) {
            allProfilesMap.set(p.id, p);
        }
        const allProfiles = Array.from(allProfilesMap.values());

        // 4. Build context with more detailed logging
        const postContext = allPosts.map((c: any) => {
            const author = allProfiles.find((p: any) => p.id === c.profile_id);
            console.log('Post author lookup:', { postId: c.id, profileId: c.profile_id, author });
            return `Post by ${c.author_name || author?.full_name || 'Unknown'}: ${c.content.trim()}`;
        }).join('\n\n');

        const profileContext = allProfiles.map((c: any) => {
            console.log('Profile context:', c);
            return `Profile: ${c.full_name || 'Unnamed'} - ${c.title || 'No title'} - ${c.location || 'No location'} - ${c.bio || 'No bio'} - Skills: ${(c.skills || []).join(', ')} - Email: ${c.email || 'Not provided'}`;
        }).join('\n\n');

        const context = [postContext, profileContext].filter(Boolean).join('\n\n');
        console.log('Final context being sent to GPT:', {
            context,
            profileCount: allProfiles.length,
            postCount: allPosts.length,
            profileNames: allProfiles.map(p => p.full_name)
        });

        if (!context) {
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
