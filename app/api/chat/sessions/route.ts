import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sessionContextManager } from '../utils/session-context';

export async function GET(req: NextRequest) {
  try {
    // Clean up old session contexts periodically
    sessionContextManager.cleanupOldSessions(24);
    
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, title } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get the authorization header to pass to Supabase
    const authHeader = req.headers.get('authorization');
    
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

    // Create the session
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        title: title || null
      })
      .select()
      .single();

    if (error) {
      // If session already exists, that's ok
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ session: { id: sessionId } });
      }
      throw error;
    }

    return NextResponse.json({ session });
  } catch (err: any) {
    console.error('Session create error:', err.message);
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