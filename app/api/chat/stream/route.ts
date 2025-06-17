import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import { RetrievalAgent } from '../agents/retrieval';
import { QueryParser } from '../utils/query-parser';
import { createClient } from '@supabase/supabase-js';

interface TrackedMention {
  id: string;
  name: string;
  type: 'person' | 'project';
  start: number;
  end: number;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a custom readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { message, sessionId, mentions = [], userId } = await req.json() as {
          message: string;
          sessionId?: string;
          mentions?: TrackedMention[];
          userId: string;
        };

        // Validate required parameters
        if (!message?.trim()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`));
          controller.close();
          return;
        }
        
        if (!userId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'User ID is required' })}\n\n`));
          controller.close();
          return;
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

        // Use provided sessionId or generate a new one
        let currentSessionId = sessionId;
        if (!currentSessionId) {
          const { v4: uuidv4 } = require('uuid');
          currentSessionId = uuidv4();
        }

        // Initialize agents
        const queryParser = new QueryParser();
        const retrievalAgent = new RetrievalAgent();
        
        // Pass the authenticated supabase client to the retrieval agent
        retrievalAgent.setSupabaseClient(supabase);

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

        // Send status update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'status', 
          message: '🔍 Analyzing your query...' 
        })}\n\n`));

        // Phase 1: Initial retrieval
        let searchResults = await retrievalAgent.retrieveInformation(message);

        // Send another status update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'status', 
          message: '📊 Searching across profiles, posts, and projects...' 
        })}\n\n`));

        // Create context from search results
        const contextData = {
          profiles: searchResults.profiles || [],
          posts: searchResults.posts || [],
          projects: searchResults.projects || []
        };

        // Build the prompt
        const systemPrompt = `You are an AI assistant helping users discover information about people, projects, and activities within their organization.

Available data from search:
${JSON.stringify(contextData, null, 2)}

Guidelines:
- Answer based ONLY on the provided search results
- If no results were found, acknowledge this and suggest alternative queries
- Be concise but helpful
- Cite specific sources when making claims
- Use markdown formatting for better readability`;

        const openai = getOpenAIClient();

        // Create streaming chat completion
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          stream: true,
          temperature: 0.7,
        });

        // Stream the response
        let fullResponse = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'token', 
              content 
            })}\n\n`));
          }
        }

        // Send sources
        const sources = extractSources(searchResults);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'sources', 
          sources 
        })}\n\n`));

        // Save to database (in background, don't await)
        saveToDatabase(supabase, currentSessionId, userId, message, fullResponse, mentions, sources);

        // Send done signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'done',
          sessionId: currentSessionId
        })}\n\n`));

        controller.close();
      } catch (error: any) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          error: error.message || 'Stream error' 
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function extractSources(searchResults: any): any[] {
  const sources: any[] = [];
  
  if (searchResults.profiles?.length > 0) {
    searchResults.profiles.slice(0, 3).forEach((profile: any) => {
      sources.push({
        type: 'profile',
        id: profile.id,
        name: profile.name,
        title: profile.title,
        relevance: profile._relevance
      });
    });
  }
  
  if (searchResults.posts?.length > 0) {
    searchResults.posts.slice(0, 3).forEach((post: any) => {
      sources.push({
        type: 'post',
        id: post.id,
        content: post.content.substring(0, 100) + '...',
        author: post.author_name,
        created_at: post.created_at,
        relevance: post._relevance
      });
    });
  }
  
  if (searchResults.projects?.length > 0) {
    searchResults.projects.slice(0, 3).forEach((project: any) => {
      sources.push({
        type: 'project',
        id: project.id,
        title: project.title,
        status: project.status,
        relevance: project._relevance
      });
    });
  }
  
  return sources;
}

async function saveToDatabase(
  supabase: any, 
  sessionId: string, 
  userId: string, 
  message: string, 
  response: string, 
  mentions: TrackedMention[],
  sources: any[]
) {
  try {
    // Ensure session exists
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!existingSession) {
      await supabase
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          title: message.substring(0, 100)
        });
    }

    // Save user message
    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: message,
        metadata: mentions.length > 0 ? { mentions } : undefined
      });

    // Save assistant response
    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: response,
        metadata: sources.length > 0 ? { sources } : undefined
      });

    // Update session
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error saving to database:', error);
  }
}