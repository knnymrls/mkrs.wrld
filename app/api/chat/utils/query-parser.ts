export type QueryIntent = 
  | 'find_people'
  | 'find_projects' 
  | 'find_activity'
  | 'find_knowledge'
  | 'find_relationships'
  | 'analytical'  // For counting, trends, statistics
  | 'temporal'    // For time-based queries
  | 'exploratory' // Open-ended discovery
  | 'specific'    // Looking for specific named entities
  | 'general';    // Catch-all

export type EntityType = 
  | 'person' 
  | 'project' 
  | 'skill' 
  | 'timeframe' 
  | 'location' 
  | 'role'
  | 'technology'
  | 'concept'
  | 'organization'
  | 'status'
  | 'action'
  | 'attribute';

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
    const lowerQuery = query.toLowerCase();
    
    // Check for analytical queries
    if (this.isAnalyticalQuery(lowerQuery)) return 'analytical';
    
    // Check for temporal queries
    if (this.isTemporalQuery(lowerQuery)) return 'temporal';
    
    // Check for specific entity lookups
    if (this.isSpecificEntityQuery(lowerQuery)) return 'specific';
    
    // Check for exploratory queries
    if (this.isExploratoryQuery(lowerQuery)) return 'exploratory';
    
    // Check traditional patterns with lower priority
    if (this.peoplePatterns.some(p => p.test(query))) return 'find_people';
    if (this.projectPatterns.some(p => p.test(query))) return 'find_projects';
    if (this.activityPatterns.some(p => p.test(query))) return 'find_activity';
    if (this.knowledgePatterns.some(p => p.test(query))) return 'find_knowledge';
    if (this.relationshipPatterns.some(p => p.test(query))) return 'find_relationships';
    
    return 'general';
  }

  private isAnalyticalQuery(query: string): boolean {
    const analyticalPatterns = [
      /how many/i,
      /count of/i,
      /number of/i,
      /trend/i,
      /statistics/i,
      /compare/i,
      /most \w+/i,
      /least \w+/i,
      /top \d+/i,
      /distribution/i,
      /percentage/i,
    ];
    return analyticalPatterns.some(p => p.test(query));
  }

  private isTemporalQuery(query: string): boolean {
    const temporalIndicators = [
      'when', 'since', 'before', 'after', 'during', 'between',
      'timeline', 'history', 'recently', 'lately', 'past', 'future'
    ];
    return temporalIndicators.some(indicator => query.includes(indicator));
  }

  private isSpecificEntityQuery(query: string): boolean {
    // Check if query is asking about a specific named entity
    const specificPatterns = [
      /tell me about @/i,
      /what is \"[^\"]+\"/i,
      /who is [A-Z]/i,
      /information on [A-Z]/i,
    ];
    return specificPatterns.some(p => p.test(query));
  }

  private isExploratoryQuery(query: string): boolean {
    const exploratoryPatterns = [
      /what.*(happening|going on|new)/i,
      /show me/i,
      /explore/i,
      /discover/i,
      /find out/i,
      /tell me about/i,
      /anything about/i,
    ];
    return exploratoryPatterns.some(p => p.test(query));
  }

  private extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerQuery = query.toLowerCase();

    // Extract any technology/skill terms dynamically
    const techPattern = /\b(\w+(?:js|\.[a-z]+|script|sql|ml|ai|db))\b/gi;
    const techMatches = query.match(techPattern);
    if (techMatches) {
      techMatches.forEach(match => {
        entities.push({
          type: 'technology',
          value: match.toLowerCase(),
          confidence: 0.9,
        });
      });
    }

    // Extract status terms
    const statusTerms = ['active', 'completed', 'paused', 'pending', 'in progress', 'finished'];
    statusTerms.forEach(status => {
      if (lowerQuery.includes(status)) {
        entities.push({
          type: 'status',
          value: status,
          confidence: 0.95,
        });
      }
    });

    // Extract action terms
    const actionPattern = /\b(create|build|develop|implement|design|manage|lead|contribute|work on|working on)\b/gi;
    const actionMatches = query.match(actionPattern);
    if (actionMatches) {
      actionMatches.forEach(match => {
        entities.push({
          type: 'action',
          value: match.toLowerCase(),
          confidence: 0.8,
        });
      });
    }

    // Extract quoted phrases as important concepts
    const quotedPattern = /"([^"]+)"/g;
    const quotedMatches = query.match(quotedPattern);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const value = match.replace(/"/g, '');
        entities.push({
          type: 'concept',
          value: value,
          confidence: 1.0, // High confidence for quoted terms
        });
      });
    }

    // Extract skills based on context, not hardcoded list
    const skillIndicators = /(expert|expertise|experience|skilled|proficient|knowledge) (?:in|with|of) ([\w\s]+?)(?:\.|,|;|$|\sand\s)/gi;
    let skillMatch;
    while ((skillMatch = skillIndicators.exec(query)) !== null) {
      const skill = skillMatch[2].trim();
      if (skill.length > 2) {
        entities.push({
          type: 'skill',
          value: skill.toLowerCase(),
          confidence: 0.85,
        });
      }
    }

    // Extract roles dynamically
    const rolePattern = /\b([\w\s]+ )?(developer|engineer|designer|manager|lead|architect|analyst|scientist|researcher|consultant|specialist|coordinator|director|intern)s?\b/gi;
    let roleMatch;
    while ((roleMatch = rolePattern.exec(query)) !== null) {
      const prefix = roleMatch[1] ? roleMatch[1].trim() : '';
      const role = roleMatch[2];
      const fullRole = prefix ? `${prefix} ${role}` : role;
      entities.push({
        type: 'role',
        value: fullRole.toLowerCase(),
        confidence: 0.85,
      });
    }

    // Extract capitalized names more intelligently
    const namePattern = /\b([A-Z][a-z]+(\s+[A-Z][a-z]+)+)\b/g;
    let nameMatch;
    while ((nameMatch = namePattern.exec(query)) !== null) {
      const potentialName = nameMatch[1];
      // Check if it's not a common title or technology
      const commonTerms = ['Project', 'Team', 'Department', 'Company', 'Microsoft', 'Google', 'Amazon'];
      if (!commonTerms.includes(potentialName.split(' ')[0])) {
        entities.push({
          type: 'person',
          value: potentialName,
          confidence: 0.7,
        });
      }
    }

    // Extract organization names
    const orgPattern = /\b(at|from|with|for) ([A-Z][\w\s]+?)(?:\.|,|;|$|\sand\s)/g;
    let orgMatch;
    while ((orgMatch = orgPattern.exec(query)) !== null) {
      const org = orgMatch[2].trim();
      if (org.length > 2 && !entities.some(e => e.value === org)) {
        entities.push({
          type: 'organization',
          value: org,
          confidence: 0.6,
        });
      }
    }

    // Extract location indicators
    const locationPattern = /\b(in|from|based in|located in) ([A-Z][\w\s]+?)(?:\.|,|;|$|\sand\s)/g;
    let locMatch;
    while ((locMatch = locationPattern.exec(query)) !== null) {
      const location = locMatch[2].trim();
      if (location.length > 2) {
        entities.push({
          type: 'location',
          value: location,
          confidence: 0.7,
        });
      }
    }

    // Remove duplicates and return
    const seen = new Set();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
    const lowerQuery = query.toLowerCase();
    
    // Check relative time patterns
    for (const [pattern, calculator] of Object.entries(this.timePatterns.relative)) {
      if (lowerQuery.includes(pattern)) {
        const timeRange = calculator();
        return {
          ...timeRange,
          relative: pattern,
        };
      }
    }

    // Check for "in the last X days/weeks/months" patterns
    const lastXPattern = /in\s+the\s+last\s+(\d+)\s+(day|week|month|year)s?/i;
    const lastXMatch = query.match(lastXPattern);
    if (lastXMatch) {
      const amount = parseInt(lastXMatch[1]);
      const unit = lastXMatch[2];
      const end = new Date();
      const start = new Date();
      
      switch (unit) {
        case 'day':
          start.setDate(start.getDate() - amount);
          break;
        case 'week':
          start.setDate(start.getDate() - (amount * 7));
          break;
        case 'month':
          start.setMonth(start.getMonth() - amount);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - amount);
          break;
      }
      
      return {
        start,
        end,
        relative: lastXMatch[0],
      };
    }

    // Check for "past X days/weeks/months" patterns
    const pastXPattern = /past\s+(\d+)\s+(day|week|month|year)s?/i;
    const pastXMatch = query.match(pastXPattern);
    if (pastXMatch) {
      const amount = parseInt(pastXMatch[1]);
      const unit = pastXMatch[2];
      const end = new Date();
      const start = new Date();
      
      switch (unit) {
        case 'day':
          start.setDate(start.getDate() - amount);
          break;
        case 'week':
          start.setDate(start.getDate() - (amount * 7));
          break;
        case 'month':
          start.setMonth(start.getMonth() - amount);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - amount);
          break;
      }
      
      return {
        start,
        end,
        relative: pastXMatch[0],
      };
    }

    // Check for specific date patterns (yesterday, today, tomorrow)
    if (lowerQuery.includes('yesterday')) {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end, relative: 'yesterday' };
    }
    
    if (lowerQuery.includes('today')) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      return { start, end, relative: 'today' };
    }
    
    if (lowerQuery.includes('tomorrow')) {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end, relative: 'tomorrow' };
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