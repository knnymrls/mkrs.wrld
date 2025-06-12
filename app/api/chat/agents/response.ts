import { OpenAI } from 'openai';
import { 
  SearchResults, 
  DataGap, 
  DataRequest,
  ProgressUpdate,
  Source 
} from '../types';
import { ParsedQuery } from '../utils/query-parser';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
});

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
      return {
        answer: "I couldn't find any relevant information in the database to answer your question.",
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
            const hasRelevantSkills = query.entities
              .filter(e => e.type === 'skill')
              .some(skill => 
                p.skills?.some((s: string) => 
                  s.toLowerCase().includes(skill.value.toLowerCase())
                )
              );
            
            const hasRelevantExperience = p.experiences?.length > 0;
            
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
        const profilesWithoutExperience = results.profiles.filter(p => 
          !p.experiences || p.experiences.length === 0
        );
        
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
        const projectsWithoutContributors = results.projects.filter(p => 
          !p.contributions || p.contributions.length === 0
        );
        
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
              type: 'recent_activity',
              parameters: { days: 30 },
              reason: 'To show recent work and contributions',
            };
            
          case 'experience_details':
            return {
              type: 'experience_details',
              parameters: {},
              reason: 'To provide complete work history',
            };
            
          case 'project_details':
            return {
              type: 'project_details',
              parameters: {},
              reason: 'To show who is working on these projects',
            };
            
          default:
            return {
              type: 'skill_verification',
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
          let context = `Profile: ${p.name || 'Unnamed'} - ${p.title || 'No title'} - ${p.location || 'No location'}`;
          
          if (p.bio) {
            context += ` - Bio: ${p.bio}`;
          }
          
          if (p.skills && p.skills.length > 0) {
            context += ` - Skills: ${p.skills.join(', ')}`;
          }
          
          if (p.experiences && p.experiences.length > 0) {
            const expText = p.experiences
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
          
          if (p._reason) {
            context += ` (Match: ${p._reason})`;
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
          let context = `Project: "${p.title}" - Status: ${p.status} - ${p.description}`;
          
          if (p.contributions && p.contributions.length > 0) {
            const contribNames = p.contributions
              .map((c: any) => c.role)
              .join(', ');
            context += ` - Contributors: ${contribNames}`;
          }
          
          if (p._reason) {
            context += ` (Match: ${p._reason})`;
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
          if (e.profile) {
            context += ` (${e.profile.name})`;
          }
          return context;
        })
        .join('\n\n');
      
      sections.push('=== WORK EXPERIENCE ===\n' + expContext);
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

RESPONSE FORMAT for specific queries:
- Direct answer with name and 1-2 key reasons
- One follow-up question

RESPONSE FORMAT for exploratory queries:
- More detailed information
- Still end with a follow-up question`;

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
      
      general: `
Provide a helpful answer and ask how you can help further.`,
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
          title: profile.title,
          relevanceScore: profile._score || 0.8, // Higher base score for profiles
        });
      }
    }
    
    // Extract sources from projects
    for (const project of results.projects.slice(0, 10)) {
      sources.push({
        type: 'project',
        id: project.id,
        name: project.title,
        description: project.description,
        relevanceScore: project._score || 0.6, // Lower base score for projects
      });
    }
    
    // Extract sources from posts
    for (const post of results.posts.slice(0, 10)) {
      const preview = post.content.length > 100 
        ? post.content.substring(0, 100) + '...' 
        : post.content;
      
      // Find author name from profiles
      const author = results.profiles.find(p => p.id === post.author_id);
      
      sources.push({
        type: 'post',
        id: post.id,
        preview,
        author: author?.name || 'Unknown',
        relevanceScore: post._score || 0.4,
      });
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
}