import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get the authorization header to pass to Supabase
    const authHeader = req.headers.get('authorization');
    
    // Create Supabase client with the user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: authHeader || '',
          },
        },
      }
    );

    if (sessionId) {
      // Fetch specific session with messages
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          messages:chat_messages(*)
        `)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError) throw sessionError;

      // Sort messages by created_at
      if (session && session.messages) {
        session.messages.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return NextResponse.json({ session });
    } else {
      // Fetch all sessions for user
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      return NextResponse.json({ sessions: sessions || [] });
    }
  } catch (err: any) {
    console.error('Sessions fetch error:', err.message);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Session ID and User ID required' }, { status: 400 });
    }

    // Get the authorization header to pass to Supabase
    const authHeader = req.headers.get('authorization');
    
    // Create Supabase client with the user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: authHeader || '',
          },
        },
      }
    );

    // Delete session (messages will cascade delete)
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Session delete error:', err.message);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}