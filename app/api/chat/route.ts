import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { RetrievalAgent } from './agents/retrieval';
import { ResponseAgent } from './agents/response';
import { QueryParser } from './utils/query-parser';
import { createClient } from '@supabase/supabase-js';
import { ChatSession, ChatMessage } from '@/app/models/chat';
import { TypedSupabaseClient } from '@/app/types/supabase';
import { SearchResults } from '@/app/models/Search';
import { DataRequest } from '@/app/types/chat';
import { Source } from '@/app/models/Search';
import { Profile } from '@/app/models/Profile';
import { Project } from '@/app/models/Project';
import { Post } from '@/app/models/Post';
import { sessionContextManager } from './utils/session-context';

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


    // Validate required parameters
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the authorization header to pass to Supabase
    const authHeader = req.headers.get('authorization');

    // Create Supabase client with the user's auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            authorization: authHeader || '',
          },
        },
      }
    );

    // Use provided sessionId or generate a new one
    let currentSessionId = sessionId;

    // For now, we'll use the provided sessionId without database validation
    // This allows the frontend to manage sessions via localStorage
    if (!currentSessionId) {
      // Only create a new session if none was provided
      const { v4: uuidv4 } = require('uuid');
      currentSessionId = uuidv4();
    }

    // Fetch chat history from database if session exists
    const chatHistory: ChatCompletionMessageParam[] = [];

    if (currentSessionId) {
      try {
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('messages:chat_messages(*)')
          .eq('id', currentSessionId)
          .eq('user_id', userId)
          .single();

        if (sessionData?.messages) {
          // Convert database messages to OpenAI format
          // Limit to last 10 messages for context window
          const recentMessages = sessionData.messages
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(-10);

          recentMessages.forEach((msg: any) => {
            chatHistory.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            });
          });
        }
      } catch (error) {
        console.log('No existing session found, starting fresh');
      }
    }

    // Initialize agents without SSE for now - we'll optimize differently
    const queryParser = new QueryParser();
    const retrievalAgent = new RetrievalAgent();
    const responseAgent = new ResponseAgent();

    // Pass the authenticated supabase client to the retrieval agent
    retrievalAgent.setSupabaseClient(supabase);

    // Enhance query with session context
    const enhancedMessage = sessionContextManager.enhanceQueryWithContext(
      message,
      currentSessionId || '',
      chatHistory
    );

    // Parse the enhanced query
    const parsedQuery = queryParser.parse(enhancedMessage);

    // Add mentions to parsed query if any
    if (mentions.length > 0) {
      parsedQuery.mentions.people = mentions
        .filter(m => m.type === 'person')
        .map(m => m.name);
      parsedQuery.mentions.projects = mentions
        .filter(m => m.type === 'project')
        .map(m => m.name);
    }

    // Update session context
    sessionContextManager.updateContext(currentSessionId || '', {
      userId,
      lastQuery: message,
      lastEntities: parsedQuery.entities,
      lastMentions: mentions,
      messageCount: chatHistory.length + 1
    });

    // Phase 1: Initial retrieval (use enhanced message for better context)
    let searchResults = await retrievalAgent.retrieveInformation(enhancedMessage);

    // Phase 2: Response synthesis with potential feedback loop
    let finalAnswer = '';
    let sources: Source[] = [];
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

    // First, ensure the session exists
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', currentSessionId)
      .eq('user_id', userId)
      .single();

    if (!existingSession) {
      // Create session if it doesn't exist
      const { error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          id: currentSessionId,
          user_id: userId,
          title: message.substring(0, 100) // Use first 100 chars as title
        });

      if (createError && createError.code !== '23505') { // Ignore if already exists
        console.error('Session create error:', createError);
      }
    }

    // Store user message in database
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
      // Continue even if message save fails
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

    if (assistantMsgError) {
      console.error('Assistant message insert error:', assistantMsgError);
      // Continue even if message save fails
    }

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

  } catch (err) {
    console.error('Chat error:', err instanceof Error ? err.message : 'Unknown error', err instanceof Error ? err.stack : '');

    // Return more specific error messages in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Server error: ${err instanceof Error ? err.message : 'Unknown error'}`
      : 'Server error.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function executeDataRequest(request: DataRequest, results: SearchResults, supabase: TypedSupabaseClient) {
  switch (request.type) {
    case 'recent_activity':
      // Fetch recent posts for found profiles
      const profileIds = results.profiles.map((p: Profile) => p.id).slice(0, 5);

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
        .filter((p: Profile) => !(p as any).experiences || (p as any).experiences?.length === 0)
        .map((p: Profile) => p.id);

      for (const profileId of profilesNeedingExp) {
        const { data: experiences } = await supabase
          .from('experiences')
          .select('*')
          .eq('profile_id', profileId);

        if (experiences) {
          const profile = results.profiles.find((p: Profile) => p.id === profileId) as any;
          if (profile) {
            profile.experiences = experiences;
          }
        }
      }
      break;

    case 'project_details':
      // Fetch missing contributor details
      const projectIds = results.projects
        .filter((p: Project) => !(p as any).contributions || (p as any).contributions?.length === 0)
        .map((p: Project) => p.id);

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
          const project = results.projects.find((p: Project) => p.id === projectId) as any;
          if (project) {
            project.contributions = contributions;
          }
        }
      }
      break;
  }
}