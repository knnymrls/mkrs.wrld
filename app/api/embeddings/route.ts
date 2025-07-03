import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const openai = getOpenAIClient();
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return NextResponse.json({ embedding: response.data[0].embedding });
    } catch (error) {
        console.error('Embedding error:', error);
        return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }
}