// app/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        // 1. Embed the input
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: message,
        });

        const embedding = embeddingRes.data[0].embedding;

        // 2. Semantic search in Supabase
        const { data: chunks, error: searchError } = await supabase.rpc('match_posts', {
            query_embedding: embedding,
            match_threshold: 0.78,
            match_count: 3,
        });

        if (searchError) throw new Error(searchError.message);

        const context = (chunks || []).map((c: any) => c.content.trim()).join('\n\n');

        if (!context) {
            return NextResponse.json({
                answer: "Sorry, I couldn't find anything relevant to your question.",
            });
        }

        // 3. Generate answer with context
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a helpful assistant. Use the provided context to answer the user’s question.',
                },
                {
                    role: 'user',
                    content: `Context:\n${context}\n\nQuestion: ${message}`,
                },
            ],
        });

        const answer = completion.choices[0].message.content;
        return NextResponse.json({ answer });
    } catch (err: any) {
        console.error('Chat error:', err.message);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}
