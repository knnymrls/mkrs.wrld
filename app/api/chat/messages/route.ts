import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Create Supabase client with the user's auth token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        authorization: authHeader,
                    },
                },
            }
        );
        
        // Get the current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { sessionId, role, content, metadata } = body;

        if (!sessionId || !role || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Save the message
        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
                session_id: sessionId,
                user_id: user.id,
                role,
                content,
                metadata: metadata || {}
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving chat message:', error);
            return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
        }

        // Update the session's updated_at timestamp
        const { error: updateError } = await supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating session timestamp:', updateError);
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Error in chat messages POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}