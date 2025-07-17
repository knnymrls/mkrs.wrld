import { OpenAI } from 'openai';
import { DataGap, DataRequest, ProgressUpdate } from '@/app/types/chat';
import { SearchResults, Source } from '@/app/models/Search';
import { ParsedQuery } from '../utils/query-parser';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createClient } from '@supabase/supabase-js';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class ResponseAgent {
  private progressCallback?: (update: ProgressUpdate) => void | Promise<void>;

  constructor(progressCallback?: (update: ProgressUpdate) => void | Promise<void>) {
    this.progressCallback = progressCallback;
  }

  async synthesizeResponse(
    results: SearchResults,
    query: ParsedQuery,
    chatHistory: ChatCompletionMessageParam[]
  ): Promise<{ answer: string; needsMoreData: boolean; dataRequests?: DataRequest[]; sources?: Source[] }> {
    // First, evaluate if we have enough data
    const evaluation = this.evaluateResults(results, query);

    if (evaluation.score < 0.3) {
      // Very poor results, might need more data
      const gaps = this.identifyGaps(results, query);
      const dataRequests = this.createDataRequests(gaps);

      if (dataRequests.length > 0) {
        await this.emitProgress({
          type: 'requesting_more',
          message: 'Gathering additional details...',
          emoji: '🔄',
        });

        return {
          answer: '',
          needsMoreData: true,
          dataRequests,
        };
      }
    }

    // Build context from results
    const context = this.buildContext(results, query);

    if (!context || context.trim() === '') {
      // Use AI to generate a helpful response even with no results
      const answer = await this.generateIntelligentNoResultsResponse(query, results);

      return {
        answer,
        needsMoreData: false,
      };
    }

    // Extract top sources before generating response
    const sources = this.extractTopSources(results, query);

    // Generate response using LLM
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(query),
      },
      ...chatHistory,
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query.originalQuery}`,
      },
    ];

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content ||
      "I apologize, but I couldn't generate a response.";

    return {
      answer,
      needsMoreData: false,
      sources: sources.slice(0, 3), // Return top 3 sources
    };
  }

  private evaluateResults(results: SearchResults, query: ParsedQuery): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Check if we have any results
    const totalResults =
      results.profiles.length +
      results.posts.length +
      results.projects.length +
      results.experiences.length;

    if (totalResults === 0) {
      return { score: 0, reason: 'No results found' };
    }

    // Evaluate based on query intent
    switch (query.intent) {
      case 'find_people':
        if (results.profiles.length > 0) {
          score += 0.5;

          // Check if profiles have relevant skills/experience
          const relevantProfiles = results.profiles.filter(p => {
            const profileWithSkills = p as any;
            const hasRelevantSkills = query.entities
              .filter(e => e.type === 'skill')
              .some(skill =>
                profileWithSkills.skills?.some((s: string) =>
                  s.toLowerCase().includes(skill.value.toLowerCase())
                )
              );

            const hasRelevantExperience = profileWithSkills.experiences?.length > 0;

            return hasRelevantSkills || hasRelevantExperience;
          });

          if (relevantProfiles.length > 0) {
            score += 0.3;
            reasons.push(`Found ${relevantProfiles.length} people with relevant skills`);
          }
        }

        // Bonus for finding experiences
        if (results.experiences.length > 0) {
          score += 0.2;
          reasons.push('Found relevant work experience');
        }
        break;

      case 'find_projects':
        if (results.projects.length > 0) {
          score += 0.7;
          reasons.push(`Found ${results.projects.length} projects`);
        }

        // Bonus for finding related posts
        if (results.posts.length > 0) {
          score += 0.2;
          reasons.push('Found related discussions');
        }
        break;

      case 'find_activity':
        if (results.posts.length > 0) {
          score += 0.6;

          // Check recency
          const recentPosts = results.posts.filter(p => {
            const postDate = new Date(p.created_at);
            const daysSince = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince < 30;
          });

          if (recentPosts.length > 0) {
            score += 0.3;
            reasons.push(`Found ${recentPosts.length} recent posts`);
          }
        }
        break;

      default:
        // General query - any results are good
        if (totalResults > 5) {
          score = 0.7;
          reasons.push(`Found ${totalResults} relevant items`);
        } else {
          score = 0.4;
          reasons.push(`Found only ${totalResults} items`);
        }
    }

    return {
      score: Math.min(score, 1),
      reason: reasons.join(', ') || 'Evaluation complete',
    };
  }

  private identifyGaps(results: SearchResults, query: ParsedQuery): DataGap[] {
    const gaps: DataGap[] = [];

    switch (query.intent) {
      case 'find_people':
        // Check if we found people but missing their recent activity
        if (results.profiles.length > 0 && results.posts.length === 0) {
          gaps.push({
            type: 'recent_activity',
            description: 'No recent posts from these people',
            importance: 'medium',
          });
        }

        // Check if we need experience details
        const profilesWithoutExperience = results.profiles.filter(p => {
          const profileWithExp = p as any;
          return !profileWithExp.experiences || profileWithExp.experiences.length === 0;
        });

        if (profilesWithoutExperience.length > 0) {
          gaps.push({
            type: 'experience_details',
            description: 'Missing work experience for some profiles',
            importance: 'high',
          });
        }
        break;

      case 'find_projects':
        // Check if we need contributor details
        const projectsWithoutContributors = results.projects.filter(p => {
          const projectWithContribs = p as any;
          return !projectWithContribs.contributions || projectWithContribs.contributions.length === 0;
        });

        if (projectsWithoutContributors.length > 0) {
          gaps.push({
            type: 'project_details',
            description: 'Missing contributor information for projects',
            importance: 'high',
          });
        }
        break;
    }

    return gaps;
  }

  private createDataRequests(gaps: DataGap[]): DataRequest[] {
    return gaps
      .filter(gap => gap.importance === 'high')
      .map(gap => {
        switch (gap.type) {
          case 'recent_activity':
            return {
              type: 'recent_activity' as const,
              parameters: {
                timeRange: {
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  end: new Date().toISOString()
                }
              },
              reason: 'To show recent work and contributions',
            };

          case 'experience_details':
            return {
              type: 'experience_details' as const,
              parameters: {},
              reason: 'To provide complete work history',
            };

          case 'project_details':
            return {
              type: 'project_details' as const,
              parameters: {},
              reason: 'To show who is working on these projects',
            };

          default:
            return {
              type: 'skill_verification' as const,
              parameters: {},
              reason: 'To verify expertise levels',
            };
        }
      });
  }

  private buildContext(results: SearchResults, query: ParsedQuery): string {
    const sections: string[] = [];

    // Build profile context with full details
    if (results.profiles.length > 0) {
      const profileContext = results.profiles
        .slice(0, 10) // Limit to top 10
        .map(p => {
          const profileWithDetails = p as any;
          let context = `Profile: ${p.name || 'Unnamed'} - ${p.title || 'No title'} - ${p.location || 'No location'}`;

          if (p.bio) {
            context += ` - Bio: ${p.bio}`;
          }

          if (profileWithDetails.skills && profileWithDetails.skills.length > 0) {
            context += ` - Skills: ${profileWithDetails.skills.join(', ')}`;
          }

          if (profileWithDetails.experiences && profileWithDetails.experiences.length > 0) {
            const expText = profileWithDetails.experiences
              .map((exp: any) => {
                let expStr = `${exp.role} at ${exp.company}`;
                if (exp.description) {
                  expStr += `: ${exp.description}`;
                }
                return expStr;
              })
              .join('; ');
            context += ` - Experience: ${expText}`;
          }

          if (profileWithDetails._reason) {
            context += ` (Match: ${profileWithDetails._reason})`;
          }

          return context;
        })
        .join('\n\n');

      sections.push('=== PEOPLE ===\n' + profileContext);
    }

    // Build project context
    if (results.projects.length > 0) {
      const projectContext = results.projects
        .slice(0, 10)
        .map(p => {
          const projectWithContribs = p as any;
          let context = `Project: "${p.title}" - Status: ${p.status} - ${p.description}`;

          if (projectWithContribs.contributions && projectWithContribs.contributions.length > 0) {
            const contribNames = projectWithContribs.contributions
              .map((c: any) => c.role)
              .join(', ');
            context += ` - Contributors: ${contribNames}`;
          }

          if (projectWithContribs._reason) {
            context += ` (Match: ${projectWithContribs._reason})`;
          }

          return context;
        })
        .join('\n\n');

      sections.push('=== PROJECTS ===\n' + projectContext);
    }

    // Build posts context
    if (results.posts.length > 0) {
      const postContext = results.posts
        .slice(0, 15)
        .map(p => {
          const date = new Date(p.created_at).toLocaleDateString();
          return `Post (${date}): ${p.content}`;
        })
        .join('\n\n');

      sections.push('=== RECENT ACTIVITY ===\n' + postContext);
    }

    // Build experience context if standalone experiences
    if (results.experiences.length > 0) {
      const expContext = results.experiences
        .slice(0, 10)
        .map(e => {
          let context = `Experience: ${e.role} at ${e.company}`;
          if (e.description) {
            context += ` - ${e.description}`;
          }
          const expWithProfile = e as any;
          if (expWithProfile.profile) {
            context += ` (${expWithProfile.profile.name})`;
          }
          return context;
        })
        .join('\n\n');

      sections.push('=== WORK EXPERIENCE ===\n' + expContext);
    }

    // Build project requests context
    if (results.projectRequests && results.projectRequests.length > 0) {
      const requestContext = results.projectRequests
        .slice(0, 10)
        .map(r => {
          const request = r as any;
          let context = `Project Request: "${request.title}" - ${request.description}`;
          context += ` - Skills needed: ${request.skills_needed.join(', ')}`;
          context += ` - Time: ${request.time_commitment} - Urgency: ${request.urgency}`;
          if (request.creator) {
            context += ` - Posted by: ${request.creator.name}`;
          }
          if (request._reason) {
            context += ` (Match: ${request._reason})`;
          }
          return context;
        })
        .join('\n\n');

      sections.push('=== PROJECT OPPORTUNITIES ===\n' + requestContext);
    }

    return sections.join('\n\n');
  }

  private getSystemPrompt(query: ParsedQuery): string {
    const basePrompt = `You are a helpful, professional assistant for a company's knowledge discovery system. 
Your job is to help people quickly find relevant information about colleagues, projects, and expertise.

CRITICAL RULES:
1. ONLY use information explicitly present in the context
2. BE CONCISE when the user asks a specific question (e.g., "who is best for X")
3. Be more detailed only when the user asks open-ended questions
4. ALWAYS end with a relevant follow-up question to help the user
5. For specific queries (like "best for X"), give a direct answer in 2-3 sentences max
6. Use a conversational, helpful tone
7. When answering ANY type of query, extract and present the relevant information

CONVERSATION CONTEXT:
- You can see the conversation history and should reference it when appropriate
- If users say "it", "they", "that", etc., refer to what was previously discussed
- For follow-up questions like "tell me more" or "what else", expand on the last topic
- Build on previous context to provide a natural conversation flow

RESPONSE FORMAT for specific queries:
- Direct answer with name and 1-2 key reasons
- One follow-up question

RESPONSE FORMAT for exploratory queries:
- More detailed information
- Still end with a follow-up question

RESPONSE FORMAT for follow-up queries:
- Reference what was previously discussed
- Provide additional details or context
- Continue the conversation naturally`;

    // Add intent-specific instructions
    const intentPrompts: Record<string, string> = {
      find_people: `
When recommending people for a specific need:
- Give the TOP recommendation with 2-3 bullet points max
- Example: "Kenny Morales - React/Node.js developer, currently working on AI projects"
- Follow-up examples: "Would you like to see other candidates?" or "What specific skills are most important for this project?"`,

      find_projects: `
When describing projects:
- Name the project and its main purpose
- List 1-2 key contributors
- Follow-up examples: "Want to know more about the timeline?" or "Interested in similar projects?"`,

      find_activity: `
When summarizing activity:
- Give the most relevant 2-3 updates
- Follow-up examples: "Want to see activity from a specific time period?" or "Looking for updates on a particular topic?"`,

      find_knowledge: `
When sharing knowledge:
- Name the expert and their specific experience
- Follow-up examples: "Need more technical details?" or "Want to see who else has this expertise?"`,

      find_relationships: `
When explaining connections:
- State the connection clearly
- Follow-up examples: "Want to explore their shared projects?" or "Interested in finding more connections?"`,

      analytical: `
When providing analytics:
- Present numbers and trends clearly
- Summarize key insights
- Follow-up examples: "Want to see a breakdown by department?" or "Interested in historical trends?"`,

      temporal: `
When answering time-based queries:
- Clearly state the time period covered
- Highlight the most important events/changes
- Follow-up examples: "Want to see earlier activity?" or "Need more detail on any specific event?"`,

      exploratory: `
When handling exploratory queries:
- Provide a comprehensive overview
- Organize information by relevance
- Follow-up examples: "What aspect interests you most?" or "Should I dive deeper into any area?"`,

      specific: `
When answering about specific entities:
- Provide complete information about the entity
- Include relevant connections and context
- Follow-up examples: "Want to know about their recent work?" or "Interested in similar profiles?"`,

      general: `
Provide a helpful answer based on all available information.
Organize the response by relevance and type.
Ask how you can help further or what specific aspect they'd like to explore.`,
    };

    return basePrompt + '\n' + (intentPrompts[query.intent] || intentPrompts.general);
  }

  private extractTopSources(results: SearchResults, query: ParsedQuery): Source[] {
    const sources: Source[] = [];

    // Extract sources from profiles with higher base score for people
    for (const profile of results.profiles.slice(0, 10)) {
      if (profile.id && profile.name) {
        sources.push({
          type: 'profile',
          id: profile.id,
          name: profile.name,
          title: profile.title || undefined,
          relevanceScore: (profile as any)._score || 0.8, // Higher base score for profiles
        });
      }
    }

    // Extract sources from projects
    for (const project of results.projects.slice(0, 10)) {
      sources.push({
        type: 'project',
        id: project.id,
        name: project.title,
        description: project.description || undefined,
        relevanceScore: (project as any)._score || 0.6, // Lower base score for projects
      });
    }

    // Extract sources from posts
    for (const post of results.posts.slice(0, 10)) {
      const preview = post.content.length > 100
        ? post.content.substring(0, 100) + '...'
        : post.content;

      // Find author name from profiles
      const author = results.profiles.find(p => p.id === post.author.id);

      sources.push({
        type: 'post',
        id: post.id,
        preview,
        author: author?.name || 'Unknown',
        relevanceScore: (post as any)._score || 0.4,
      });
    }

    // Extract sources from project requests
    if (results.projectRequests) {
      for (const request of results.projectRequests.slice(0, 10)) {
        sources.push({
          type: 'project_request',
          id: request.id,
          title: request.title,
          description: request.description || undefined,
          relevanceScore: (request as any)._score || 0.7, // Good relevance for opportunities
        });
      }
    }

    // Sort by relevance score
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return sources;
  }

  private async emitProgress(update: ProgressUpdate) {
    if (this.progressCallback) {
      await this.progressCallback(update);
    }
    // Progress is emitted only if callback is provided
  }

  private async generateIntelligentNoResultsResponse(
    query: ParsedQuery,
    results: SearchResults
  ): Promise<string> {
    // Skip expensive AI call and database summary for speed
    const followUpQuestions = this.generateFollowUpQuestions(query, results);

    // Generate a simple but helpful response
    let response = `I searched for ${this.describeSearch(query)} but didn't find exact matches.`;

    // Add context based on query type
    if (query.intent === 'temporal') {
      response += ` The data might exist outside the specified timeframe.`;
    } else if (query.intent === 'find_people') {
      response += ` The skills or expertise you're looking for might be available under different terms.`;
    }

    // Add follow-up questions
    if (followUpQuestions.length > 0) {
      response += '\n\n' + followUpQuestions.join('\n\n');
    }

    return response;
  }

  // Removed expensive database summary method

  private generateFollowUpQuestions(query: ParsedQuery, results: SearchResults): string[] {
    const questions: string[] = [];

    // Generate follow-ups based on query structure, not hardcoded content

    // If there was a time constraint, suggest removing it
    if (query.timeConstraints) {
      questions.push(`Would you like to search without the time constraint?`);
    }

    // If searching for specific skills/technologies, suggest related searches
    const skills = query.entities.filter(e => e.type === 'skill' || e.type === 'technology');
    if (skills.length > 0) {
      questions.push(`Should I search for related skills or technologies?`);
      questions.push(`Would you like to see people with transferable skills?`);
    }

    // Based on intent, suggest different search strategies
    switch (query.intent) {
      case 'find_people':
        questions.push(`Would you like to see all available profiles?`);
        questions.push(`Should I look for people who could potentially develop these skills?`);
        break;
      case 'find_projects':
        questions.push(`Would you like to see all projects regardless of criteria?`);
        questions.push(`Should I search for projects in related areas?`);
        break;
      case 'temporal':
        questions.push(`Would you like to see the most recent data available?`);
        questions.push(`Should I expand the time range?`);
        break;
      case 'analytical':
        questions.push(`Would you like to see general statistics instead?`);
        questions.push(`Should I analyze different metrics?`);
        break;
    }

    // Always offer to broaden or clarify
    questions.push(`Can you tell me more about what you're looking for?`);
    questions.push(`Would you like me to search more broadly?`);

    return [...new Set(questions)].slice(0, 3); // Remove duplicates and limit to 3
  }

  private generateNoResultsResponse(query: ParsedQuery, followUpQuestions: string[]): string {
    // Use AI to generate a contextual response
    let response = `I searched for ${this.describeSearch(query)} but didn't find exact matches.`;

    // Add follow-up questions
    if (followUpQuestions.length > 0) {
      response += "\n\n" + followUpQuestions.join("\n\n");
    }

    return response;
  }

  private describeSearch(query: ParsedQuery): string {
    const parts: string[] = [];

    // Describe what was searched based on entities
    if (query.entities.length > 0) {
      const skills = query.entities.filter(e => e.type === 'skill' || e.type === 'technology').map(e => e.value);
      const people = query.entities.filter(e => e.type === 'person').map(e => e.value);
      const concepts = query.entities.filter(e => e.type === 'concept').map(e => e.value);

      if (skills.length > 0) parts.push(`${skills.join(', ')} skills`);
      if (people.length > 0) parts.push(`people named ${people.join(', ')}`);
      if (concepts.length > 0) parts.push(`${concepts.join(', ')}`);
    }

    // Add time context if present
    if (query.timeConstraints?.relative) {
      parts.push(`from ${query.timeConstraints.relative}`);
    }

    // Add intent context
    switch (query.intent) {
      case 'find_people':
        if (parts.length === 0) parts.push('people');
        break;
      case 'find_projects':
        parts.push('in projects');
        break;
      case 'find_activity':
        parts.push('in recent activity');
        break;
      case 'temporal':
        if (!query.timeConstraints) parts.push('in the specified timeframe');
        break;
    }

    return parts.join(' ') || 'the requested information';
  }

  // Removed hardcoded methods - now handled dynamically in synthesizeResponse

  private hasAnyData(results: SearchResults): boolean {
    return (
      results.profiles.length > 0 ||
      results.posts.length > 0 ||
      results.projects.length > 0 ||
      results.experiences.length > 0 ||
      results.educations.length > 0
    );
  }
}