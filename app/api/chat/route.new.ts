import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { RetrievalAgent } from './agents/retrieval';
import { ResponseAgent } from './agents/response';
import { QueryParser } from './utils/query-parser';
import { ProgressUpdate } from './types';
import { createClient } from '@supabase/supabase-js';

// In-memory chat history store
const chatHistories = new Map<string, ChatCompletionMessageParam[]>();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      mentions?: TrackedMention[];
    };

    // Initialize session data
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }

    const chatHistory = chatHistories.get(sessionId)!;

    // Create a TransformStream for SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Function to send SSE messages
    const sendSSE = async (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Start processing in the background
    (async () => {
      try {
        // Progress callback to stream updates
        const progressCallback = async (update: ProgressUpdate) => {
          await sendSSE({ type: 'progress', ...update });
        };

        // Initialize agents with progress callback
        const queryParser = new QueryParser();
        const retrievalAgent = new RetrievalAgent(progressCallback);
        const responseAgent = new ResponseAgent(progressCallback);

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
              await executeDataRequest(request, searchResults);
            }
            attempts++;
          } else {
            finalAnswer = response.answer;
            break;
          }
        }

        // Update chat history
        chatHistory.push(
          { role: 'user', content: message },
          { role: 'assistant', content: finalAnswer }
        );

        // Keep only last 10 messages
        if (chatHistory.length > 10) {
          chatHistory.splice(0, chatHistory.length - 10);
        }

        // Send final answer
        await sendSSE({ type: 'answer', content: finalAnswer });
        
        // Send done signal
        await sendSSE({ type: 'done' });

      } catch (error) {
        console.error('Processing error:', error);
        await sendSSE({ type: 'error', message: 'An error occurred' });
      } finally {
        await writer.close();
      }
    })();

    // Return SSE response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('Chat error:', err.message);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

async function executeDataRequest(request: any, results: any) {
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