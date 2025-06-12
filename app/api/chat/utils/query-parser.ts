export type QueryIntent = 
  | 'find_people'
  | 'find_projects' 
  | 'find_activity'
  | 'find_knowledge'
  | 'find_relationships'
  | 'general';

export type EntityType = 'person' | 'project' | 'skill' | 'timeframe' | 'location' | 'role';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
}

export interface ParsedQuery {
  originalQuery: string;
  intent: QueryIntent;
  entities: ExtractedEntity[];
  keywords: string[];
  timeConstraints?: {
    start?: Date;
    end?: Date;
    relative?: string;
  };
  mentions: {
    people: string[];
    projects: string[];
  };
}

export class QueryParser {
  private peoplePatterns = [
    /who\s+(would|could|should|is|are|has|have)/i,
    /someone\s+(who|with|that)/i,
    /person\s+(who|with|that)/i,
    /expert\s+(in|on|with)/i,
    /best\s+(for|at|with)/i,
    /developer|engineer|designer|manager|lead|architect/i,
    /find\s+(me\s+)?(a\s+)?person/i,
  ];

  private projectPatterns = [
    /project[s]?\s+(about|on|for|related)/i,
    /what('s|s)?\s+being\s+(built|developed|worked)/i,
    /initiative[s]?\s+(on|about|for)/i,
    /working\s+on/i,
    /building\s+\w+/i,
  ];

  private activityPatterns = [
    /what('s|s)?\s+happening/i,
    /recent(ly)?/i,
    /update[s]?\s+(on|about|from)/i,
    /latest\s+(from|about|on)/i,
    /this\s+(week|month|quarter)/i,
    /activity\s+(from|by|on)/i,
  ];

  private knowledgePatterns = [
    /how\s+(to|do|does|did)/i,
    /experience\s+(with|in|on)/i,
    /worked\s+(on|with)/i,
    /knowledge\s+(of|about|in)/i,
    /familiar\s+with/i,
    /knows?\s+(about|how)/i,
  ];

  private relationshipPatterns = [
    /who\s+knows\s+who/i,
    /connected\s+(to|with)/i,
    /worked\s+with/i,
    /collaborated\s+(with|on)/i,
    /team\s+(members|with)/i,
    /colleagues\s+(of|with)/i,
  ];

  private timePatterns = {
    relative: {
      'last week': () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return { start: date, end: new Date() };
      },
      'this week': () => {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day;
        const start = new Date(date.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return { start, end: new Date() };
      },
      'last month': () => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return { start: date, end: new Date() };
      },
      'this month': () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return { start: date, end: new Date() };
      },
      'recently': () => {
        const date = new Date();
        date.setDate(date.getDate() - 14); // Last 2 weeks
        return { start: date, end: new Date() };
      },
    },
    patterns: [
      /in\s+the\s+last\s+(\d+)\s+(day|week|month)s?/i,
      /past\s+(\d+)\s+(day|week|month)s?/i,
      /(yesterday|today|tomorrow)/i,
      /(\d{4})/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    ],
  };

  private skillKeywords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'go', 'rust',
    'kubernetes', 'docker', 'aws', 'azure', 'gcp', 'devops', 'machine learning', 'ml', 'ai',
    'data science', 'frontend', 'backend', 'full stack', 'mobile', 'ios', 'android',
    'design', 'ui', 'ux', 'product', 'marketing', 'sales', 'finance', 'hr',
    'agile', 'scrum', 'project management', 'leadership', 'strategy',
  ];

  private roleKeywords = [
    'developer', 'engineer', 'designer', 'manager', 'lead', 'architect', 'analyst',
    'scientist', 'researcher', 'consultant', 'specialist', 'coordinator', 'director',
    'vp', 'cto', 'ceo', 'founder', 'intern', 'junior', 'senior', 'principal',
  ];

  parse(query: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase();
    
    return {
      originalQuery: query,
      intent: this.detectIntent(normalizedQuery),
      entities: this.extractEntities(query),
      keywords: this.extractKeywords(normalizedQuery),
      timeConstraints: this.extractTimeConstraints(normalizedQuery),
      mentions: this.extractMentions(query),
    };
  }

  private detectIntent(query: string): QueryIntent {
    if (this.peoplePatterns.some(p => p.test(query))) return 'find_people';
    if (this.projectPatterns.some(p => p.test(query))) return 'find_projects';
    if (this.activityPatterns.some(p => p.test(query))) return 'find_activity';
    if (this.knowledgePatterns.some(p => p.test(query))) return 'find_knowledge';
    if (this.relationshipPatterns.some(p => p.test(query))) return 'find_relationships';
    return 'general';
  }

  private extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerQuery = query.toLowerCase();

    // Extract skills
    this.skillKeywords.forEach(skill => {
      if (lowerQuery.includes(skill)) {
        entities.push({
          type: 'skill',
          value: skill,
          confidence: 0.9,
        });
      }
    });

    // Extract roles
    this.roleKeywords.forEach(role => {
      const regex = new RegExp(`\\b${role}s?\\b`, 'i');
      if (regex.test(query)) {
        entities.push({
          type: 'role',
          value: role,
          confidence: 0.85,
        });
      }
    });

    // Extract potential person names (capitalized words not at start)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = query.match(namePattern);
    if (matches) {
      matches.forEach(match => {
        // Skip if it's a known skill or role
        if (!this.skillKeywords.includes(match.toLowerCase()) && 
            !this.roleKeywords.includes(match.toLowerCase())) {
          entities.push({
            type: 'person',
            value: match,
            confidence: 0.7,
          });
        }
      });
    }

    return entities;
  }

  private extractKeywords(query: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'who', 'what', 'where', 'when', 'how', 'why', 'would', 'could',
      'should', 'be', 'best', 'find', 'show', 'tell', 'me', 'us',
    ]);

    return query
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  private extractTimeConstraints(query: string): ParsedQuery['timeConstraints'] | undefined {
    // Check relative time patterns
    for (const [pattern, calculator] of Object.entries(this.timePatterns.relative)) {
      if (query.includes(pattern)) {
        const timeRange = calculator();
        return {
          ...timeRange,
          relative: pattern,
        };
      }
    }

    // Check other time patterns
    for (const pattern of this.timePatterns.patterns) {
      const match = query.match(pattern);
      if (match) {
        // Parse specific time patterns (simplified for now)
        return {
          relative: match[0],
        };
      }
    }

    return undefined;
  }

  private extractMentions(query: string): ParsedQuery['mentions'] {
    const mentions = {
      people: [] as string[],
      projects: [] as string[],
    };

    // Extract @mentions
    const mentionPattern = /@(\w+)/g;
    let match;
    while ((match = mentionPattern.exec(query)) !== null) {
      mentions.people.push(match[1]);
    }

    // Extract "Project X" patterns
    const projectPattern = /Project\s+([A-Z]\w*)/g;
    while ((match = projectPattern.exec(query)) !== null) {
      mentions.projects.push(match[1]);
    }

    return mentions;
  }
}