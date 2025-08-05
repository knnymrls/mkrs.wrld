import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getEmbedding } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Project request ID required' }, { status: 400 });
    }

    // Fetch project request
    const { data: projectRequest, error: fetchError } = await supabase
      .from('project_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !projectRequest) {
      return NextResponse.json({ error: 'Project request not found' }, { status: 404 });
    }

    // Generate embedding text
    const embeddingText = [
      projectRequest.title,
      projectRequest.description,
      ...(projectRequest.skills_needed || []),
      `${projectRequest.time_commitment} time commitment`,
      `${projectRequest.urgency} urgency`
    ].filter(Boolean).join(' ');

    // Generate embedding
    const embedding = await getEmbedding(embeddingText);

    // Update project request with embedding
    const { error: updateError } = await supabase
      .from('project_requests')
      .update({ embedding })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating project request embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}