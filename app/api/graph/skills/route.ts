import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
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

    // Fetch skills data
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('skill, profile_id, profiles(name, title)');

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      return NextResponse.json({ error: 'Failed to fetch skills data' }, { status: 500 });
    }

    // Analyze skill distribution
    const skillMap = new Map<string, { count: number; experts: any[] }>();

    skills?.forEach((item: any) => {
      const skill = item.skill;
      if (!skillMap.has(skill)) {
        skillMap.set(skill, { count: 0, experts: [] });
      }
      const skillData = skillMap.get(skill)!;
      skillData.count++;
      if (item.profiles) {
        skillData.experts.push({
          id: item.profile_id,
          name: item.profiles.name,
          title: item.profiles.title
        });
      }
    });

    // Calculate gaps (skills with only 1 expert)
    const gaps = Array.from(skillMap.entries())
      .filter(([_, data]) => data.count === 1)
      .map(([skill, data]) => ({
        skill,
        expertCount: data.count,
        experts: data.experts,
        riskLevel: 'high' as const
      }));

    // Calculate at-risk skills (2-3 experts)
    const atRisk = Array.from(skillMap.entries())
      .filter(([_, data]) => data.count >= 2 && data.count <= 3)
      .map(([skill, data]) => ({
        skill,
        expertCount: data.count,
        experts: data.experts,
        riskLevel: 'medium' as const
      }));

    // Calculate well-covered skills (4+ experts)
    const wellCovered = Array.from(skillMap.entries())
      .filter(([_, data]) => data.count >= 4)
      .map(([skill, data]) => ({
        skill,
        expertCount: data.count,
        experts: data.experts.slice(0, 5), // Limit to top 5 for performance
        riskLevel: 'low' as const
      }));

    // Analyze posts for skill demand (simplified - in production use NLP)
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(100);

    const demandMap = new Map<string, number>();
    const techKeywords = ['react', 'python', 'kubernetes', 'graphql', 'typescript', 'aws', 'docker', 'ml', 'ai'];

    recentPosts?.forEach((post: any) => {
      const content = post.content.toLowerCase();
      techKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          demandMap.set(keyword, (demandMap.get(keyword) || 0) + 1);
        }
      });
    });

    // Calculate opportunities (high demand, low supply)
    const opportunities = Array.from(demandMap.entries())
      .filter(([skill, demand]) => {
        const supply = skillMap.get(skill)?.count || 0;
        return demand > 3 && supply < 3;
      })
      .map(([skill, demand]) => ({
        skill,
        demand,
        currentExperts: skillMap.get(skill)?.count || 0,
        gap: demand - (skillMap.get(skill)?.count || 0)
      }));

    return NextResponse.json({
      summary: {
        totalSkills: skillMap.size,
        totalExperts: skills?.length || 0,
        criticalGaps: gaps.length,
        atRiskSkills: atRisk.length,
        wellCoveredSkills: wellCovered.length
      },
      gaps,
      atRisk,
      wellCovered: wellCovered.slice(0, 10), // Top 10
      opportunities: opportunities.slice(0, 5), // Top 5
      demandTrends: Array.from(demandMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, mentions]) => ({ skill, mentions }))
    });
  } catch (error) {
    console.error('Error in skills analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}