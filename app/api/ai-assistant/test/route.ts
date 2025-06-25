import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify the AI assistant API is working
export async function GET(req: NextRequest) {
  try {
    // Test the analyze endpoint with sample data
    const testContexts = [
      {
        name: 'Profile Test',
        context: {
          type: 'profile' as const,
          id: 'test-profile-123',
          content: 'Test User',
          metadata: {
            title: 'Senior Developer',
            location: 'San Francisco',
          }
        }
      },
      {
        name: 'Post Test',
        context: {
          type: 'post' as const,
          id: 'test-post-456',
          content: 'Working on implementing AI features for the knowledge graph',
          metadata: {
            author_id: 'test-author-123',
          }
        }
      },
      {
        name: 'Project Test',
        context: {
          type: 'project' as const,
          id: 'test-project-789',
          content: 'Knowledge Graph AI',
          metadata: {
            status: 'active',
            description: 'AI-powered knowledge discovery system',
          }
        }
      }
    ];

    const results = [];

    for (const test of testContexts) {
      try {
        // Call the analyze API
        const response = await fetch(new URL('/api/ai-assistant/analyze', req.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: test.context,
            userId: 'test-user-123',
          }),
        });

        const data = await response.json();
        
        results.push({
          test: test.name,
          success: response.ok,
          status: response.status,
          suggestionsCount: data.suggestions?.length || 0,
          suggestions: data.suggestions || [],
          error: data.error,
        });
      } catch (error) {
        results.push({
          test: test.name,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test failed', 
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}