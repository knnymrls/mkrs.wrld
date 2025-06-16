import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { RetrievalAgent } from './agents/retrieval';
import { ResponseAgent } from './agents/response';
import { QueryParser } from './utils/query-parser';
import { createClient } from '@supabase/supabase-js';
import { ChatSession, ChatMessage } from '@/app/models/chat';

interface TrackedMention {
  id: string;
  name: string;
  type: 'person' | 'project';
  start: number;
  end: number;
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, mentions = [], userId } = await req.json() as {
      message: string;
      sessionId?: string;
      mentions?: TrackedMention[];
      userId: string;
    };

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

    // Handle session creation or retrieval
    let currentSessionId = sessionId;
    
    // If sessionId is provided, verify it exists
    if (currentSessionId) {
      const { data: existingSession, error: checkError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', currentSessionId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingSession) {
        console.log('Session not found, creating new one');
        currentSessionId = undefined; // Force new session creation
      }
    }
    
    if (!currentSessionId) {
      // Create new session
      console.log('Creating new session for user:', userId);
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }
      
      console.log('New session created:', newSession);
      currentSessionId = newSession.id;
    }

    // Fetch recent messages from this session for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) throw messagesError;

    // Convert to chat history format
    const chatHistory: ChatCompletionMessageParam[] = (recentMessages || [])
      .reverse()
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Initialize agents without SSE for now - we'll optimize differently
    const queryParser = new QueryParser();
    const retrievalAgent = new RetrievalAgent();
    const responseAgent = new ResponseAgent();

    // Parse the query
    const parsedQuery = queryParser.parse(message);

    // Add mentions to parsed query if any
    if (mentions.length > 0) {
      parsedQuery.mentions.people = mentions
        .filter(m => m.type === 'person')
        .map(m => m.name);
      parsedQuery.mentions.projects = mentions
        .filter(m => m.type === 'project')
        .map(m => m.name);
    }

    // Phase 1: Initial retrieval
    let searchResults = await retrievalAgent.retrieveInformation(message);

    // Phase 2: Response synthesis with potential feedback loop
    let finalAnswer = '';
    let sources: any[] = [];
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      const response = await responseAgent.synthesizeResponse(
        searchResults,
        parsedQuery,
        chatHistory
      );

      if (response.needsMoreData && response.dataRequests && attempts < maxAttempts - 1) {
        // Execute additional data requests
        for (const request of response.dataRequests) {
          await executeDataRequest(request, searchResults, supabase);
        }
        attempts++;
      } else {
        finalAnswer = response.answer;
        sources = response.sources || [];
        break;
      }
    }

    // Store user message in database
    console.log('Storing user message with session_id:', currentSessionId, 'user_id:', userId);
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'user',
        content: message,
        metadata: mentions.length > 0 ? { mentions } : undefined
      });

    if (userMsgError) {
      console.error('User message insert error:', userMsgError);
      throw userMsgError;
    }

    // Store assistant response in database
    const { error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'assistant',
        content: finalAnswer,
        metadata: sources.length > 0 ? { sources } : undefined
      });

    if (assistantMsgError) throw assistantMsgError;

    // Update session updated_at
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      answer: finalAnswer, 
      sources,
      sessionId: currentSessionId 
    });

  } catch (err: any) {
    console.error('Chat error:', err.message);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

async function executeDataRequest(request: any, results: any, supabase: any) {
  switch (request.type) {
    case 'recent_activity':
      // Fetch recent posts for found profiles
      const profileIds = results.profiles.map((p: any) => p.id).slice(0, 5);

      for (const profileId of profileIds) {
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentPosts) {
          results.posts.push(...recentPosts);
        }
      }
      break;

    case 'experience_details':
      // Fetch missing experience details
      const profilesNeedingExp = results.profiles
        .filter((p: any) => !p.experiences || p.experiences.length === 0)
        .map((p: any) => p.id);

      for (const profileId of profilesNeedingExp) {
        const { data: experiences } = await supabase
          .from('experiences')
          .select('*')
          .eq('profile_id', profileId);

        if (experiences) {
          const profile = results.profiles.find((p: any) => p.id === profileId);
          if (profile) {
            profile.experiences = experiences;
          }
        }
      }
      break;

    case 'project_details':
      // Fetch missing contributor details
      const projectIds = results.projects
        .filter((p: any) => !p.contributions || p.contributions.length === 0)
        .map((p: any) => p.id);

      for (const projectId of projectIds) {
        const { data: contributions } = await supabase
          .from('contributions')
          .select(`
            person_id,
            role,
            description,
            profiles!inner(id, name, title)
          `)
          .eq('project_id', projectId);

        if (contributions) {
          const project = results.projects.find((p: any) => p.id === projectId);
          if (project) {
            project.contributions = contributions;
          }
        }
      }
      break;
  }
}