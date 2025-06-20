import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface SessionContext {
  sessionId: string;
  userId: string;
  lastQuery?: string;
  lastEntities?: Array<{
    type: string;
    value: string;
  }>;
  lastMentions?: Array<{
    id: string;
    name: string;
    type: 'person' | 'project';
  }>;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionContextManager {
  private context: Map<string, SessionContext> = new Map();
  
  getContext(sessionId: string): SessionContext | null {
    return this.context.get(sessionId) || null;
  }
  
  updateContext(sessionId: string, updates: Partial<SessionContext>): void {
    const existing = this.context.get(sessionId);
    if (existing) {
      this.context.set(sessionId, {
        ...existing,
        ...updates,
        updatedAt: new Date()
      });
    } else {
      this.context.set(sessionId, {
        sessionId,
        userId: updates.userId || '',
        messageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updates
      });
    }
  }
  
  /**
   * Enhance a query with context from previous messages
   */
  enhanceQueryWithContext(
    query: string, 
    sessionId: string,
    chatHistory: ChatCompletionMessageParam[]
  ): string {
    const context = this.getContext(sessionId);
    if (!context || chatHistory.length === 0) {
      return query;
    }
    
    // Check for pronouns or references that need context
    const needsContext = /\b(it|its|they|their|them|this|that|these|those|same|similar|another|more)\b/i.test(query);
    
    if (needsContext && context.lastEntities) {
      // Try to resolve references based on previous context
      let enhancedQuery = query;
      
      // Replace "it" or "that" with the last mentioned entity
      if (/\b(it|that)\b/i.test(query) && context.lastEntities.length > 0) {
        const lastEntity = context.lastEntities[context.lastEntities.length - 1];
        enhancedQuery = query.replace(/\b(it|that)\b/gi, lastEntity.value);
      }
      
      // Add context about what was previously discussed
      if (/\b(same|similar|another|more)\b/i.test(query)) {
        const previousTopics = context.lastEntities.map(e => e.value).join(', ');
        enhancedQuery += ` (referring to previous discussion about ${previousTopics})`;
      }
      
      return enhancedQuery;
    }
    
    return query;
  }
  
  /**
   * Extract follow-up intent from the conversation
   */
  detectFollowUpIntent(
    currentQuery: string,
    chatHistory: ChatCompletionMessageParam[]
  ): string | null {
    const lowerQuery = currentQuery.toLowerCase();
    
    // Check for common follow-up patterns
    if (/^(and|also|what about|how about|tell me more|elaborate|explain)/i.test(currentQuery)) {
      return 'follow_up';
    }
    
    if (/^(why|how come|what.*reason)/i.test(currentQuery)) {
      return 'explanation';
    }
    
    if (/^(when|what time|how long)/i.test(currentQuery)) {
      return 'temporal_detail';
    }
    
    if (/^(where|which location)/i.test(currentQuery)) {
      return 'location_detail';
    }
    
    return null;
  }
  
  /**
   * Clean up old sessions (call periodically)
   */
  cleanupOldSessions(maxAgeHours: number = 24): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    for (const [sessionId, context] of this.context.entries()) {
      if (context.updatedAt < cutoffTime) {
        this.context.delete(sessionId);
      }
    }
  }
}

// Create a singleton instance
export const sessionContextManager = new SessionContextManager();