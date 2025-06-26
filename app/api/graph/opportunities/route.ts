import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CollaborationOpportunity {
  type: 'mentorship' | 'collaboration' | 'knowledge-sharing';
  participants: any[];
  reason: string;
  confidence: number;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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

    // Fetch all necessary data
    const [
      { data: profiles },
      { data: skills },
      { data: posts },
      { data: postMentions },
      { data: contributions }
    ] = await Promise.all([
      supabase.from('profiles').select('id, name, title, location'),
      supabase.from('skills').select('profile_id, skill'),
      supabase.from('posts').select('id, author_id, content, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('post_mentions').select('post_id, profile_id'),
      supabase.from('contributions').select('person_id, project_id')
    ]);

    const opportunities: CollaborationOpportunity[] = [];

    // 1. Mentorship Opportunities
    // Find junior/senior pairs with matching skills
    const profileSkillMap = new Map<string, Set<string>>();
    skills?.forEach((s: any) => {
      if (!profileSkillMap.has(s.profile_id)) {
        profileSkillMap.set(s.profile_id, new Set());
      }
      profileSkillMap.get(s.profile_id)!.add(s.skill.toLowerCase());
    });

    // Analyze post content for expertise indicators
    const expertiseMap = new Map<string, Set<string>>();
    posts?.forEach((post: any) => {
      const content = post.content.toLowerCase();
      const authorId = post.author_id;
      
      // Simple expertise detection
      if (content.includes('implemented') || content.includes('built') || content.includes('solved')) {
        if (!expertiseMap.has(authorId)) {
          expertiseMap.set(authorId, new Set());
        }
        
        // Extract tech keywords
        const techKeywords = ['react', 'python', 'kubernetes', 'graphql', 'typescript', 'aws', 'docker'];
        techKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            expertiseMap.get(authorId)!.add(keyword);
          }
        });
      }
    });

    // Find mentorship matches
    profiles?.forEach((junior: any) => {
      const juniorSkills = profileSkillMap.get(junior.id) || new Set();
      
      profiles?.forEach((senior: any) => {
        if (junior.id === senior.id) return;
        
        const seniorExpertise = expertiseMap.get(senior.id) || new Set();
        const seniorSkills = profileSkillMap.get(senior.id) || new Set();
        
        // Check for skill overlap where senior has expertise
        const matchingSkills = Array.from(juniorSkills).filter(skill => 
          seniorExpertise.has(skill) || seniorSkills.has(skill)
        );
        
        if (matchingSkills.length > 0 && seniorExpertise.size > juniorSkills.size) {
          opportunities.push({
            type: 'mentorship',
            participants: [
              { ...junior, role: 'mentee' },
              { ...senior, role: 'mentor' }
            ],
            reason: `${senior.name} could mentor ${junior.name} in ${matchingSkills.join(', ')}`,
            confidence: Math.min(0.9, 0.5 + matchingSkills.length * 0.1)
          });
        }
      });
    });

    // 2. Collaboration Opportunities
    // Find people working on similar topics
    const topicInterestMap = new Map<string, Set<string>>();
    posts?.forEach((post: any) => {
      const content = post.content.toLowerCase();
      const topics = ['authentication', 'api', 'frontend', 'backend', 'database', 'ml', 'ai'];
      
      topics.forEach(topic => {
        if (content.includes(topic)) {
          if (!topicInterestMap.has(topic)) {
            topicInterestMap.set(topic, new Set());
          }
          topicInterestMap.get(topic)!.add(post.author_id);
        }
      });
    });

    // Find collaboration opportunities
    topicInterestMap.forEach((interestedPeople, topic) => {
      if (interestedPeople.size >= 2 && interestedPeople.size <= 5) {
        const participants = Array.from(interestedPeople).slice(0, 3).map(id => 
          profiles?.find((p: any) => p.id === id)
        ).filter(Boolean);
        
        if (participants.length >= 2) {
          opportunities.push({
            type: 'collaboration',
            participants,
            reason: `All interested in ${topic} - potential collaboration opportunity`,
            confidence: 0.7
          });
        }
      }
    });

    // 3. Knowledge Sharing Opportunities
    // Find isolated experts who should share knowledge
    const mentionCounts = new Map<string, number>();
    postMentions?.forEach((mention: any) => {
      mentionCounts.set(mention.profile_id, (mentionCounts.get(mention.profile_id) || 0) + 1);
    });

    const isolatedExperts = profiles?.filter((profile: any) => {
      const skills = profileSkillMap.get(profile.id);
      const mentions = mentionCounts.get(profile.id) || 0;
      return skills && skills.size > 3 && mentions < 2;
    });

    isolatedExperts?.forEach((expert: any) => {
      opportunities.push({
        type: 'knowledge-sharing',
        participants: [expert],
        reason: `${expert.name} has valuable skills but low engagement - encourage knowledge sharing`,
        confidence: 0.8
      });
    });

    // Sort opportunities by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence);

    // Also calculate some aggregate metrics
    const metrics = {
      knowledgeHealthScore: Math.round((profiles?.length || 0) > 0 ? 
        (opportunities.filter(o => o.type === 'collaboration').length / (profiles?.length || 1)) * 100 : 0),
      collaborationIndex: Math.round(mentionCounts.size / (profiles?.length || 1) * 100),
      expertiseCoverage: Math.round(profileSkillMap.size / (profiles?.length || 1) * 100),
      innovationIndicator: Math.round(topicInterestMap.size * 10),
      riskAlerts: isolatedExperts?.slice(0, 3).map((e: any) => 
        `${e.name} has expertise but low engagement`
      ) || [],
      opportunities: opportunities.slice(0, 3).map(o => o.reason)
    };

    return NextResponse.json({
      opportunities: opportunities.slice(0, 10),
      metrics,
      summary: {
        totalOpportunities: opportunities.length,
        mentorshipPairs: opportunities.filter(o => o.type === 'mentorship').length,
        collaborationGroups: opportunities.filter(o => o.type === 'collaboration').length,
        knowledgeSharingNeeds: opportunities.filter(o => o.type === 'knowledge-sharing').length
      }
    });
  } catch (error) {
    console.error('Error in opportunities analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}