import { SearchPlan, ProgressUpdate } from '@/app/types/chat';
import { SearchResults, SearchResult } from '@/app/models/Search';
import { QueryParser, ParsedQuery } from '../utils/query-parser';
import { EntityExpander } from '../utils/entity-expander';
import { SemanticSearchStrategy } from '../strategies/semantic';
import { KeywordSearchStrategy } from '../strategies/keyword';
import { GraphTraversalStrategy } from '../strategies/graph';

export class RetrievalAgent {
  private queryParser = new QueryParser();
  private entityExpander = new EntityExpander();
  private semanticSearch = new SemanticSearchStrategy();
  private keywordSearch = new KeywordSearchStrategy();
  private graphTraversal = new GraphTraversalStrategy();
  
  private progressCallback?: (update: ProgressUpdate) => void | Promise<void>;
  private supabaseClient?: any;

  constructor(progressCallback?: (update: ProgressUpdate) => void | Promise<void>) {
    this.progressCallback = progressCallback;
  }

  setSupabaseClient(client: any) {
    this.supabaseClient = client;
    this.semanticSearch.setSupabaseClient(client);
    this.keywordSearch.setSupabaseClient(client);
    this.graphTraversal.setSupabaseClient(client);
  }

  async retrieveInformation(query: string): Promise<SearchResults> {
    // Step 1: Analyze query
    await this.emitProgress({
      type: 'analyzing',
      message: 'Analyzing your query...',
      emoji: '🔍',
    });
    
    const parsedQuery = this.queryParser.parse(query);
    const searchPlan = await this.createSearchPlan(parsedQuery);
    
    // Step 2: Execute primary searches
    await this.emitProgress({
      type: 'searching',
      message: 'Searching across profiles, posts, and projects...',
      emoji: '📊',
    });
    
    const primaryResults = await this.executePrimarySearches(searchPlan, parsedQuery);
    
    // Step 3: Skip graph traversal for time-based queries
    if (primaryResults.length > 0 && primaryResults.length < 10 && !parsedQuery.timeConstraints) {
      await this.emitProgress({
        type: 'exploring',
        message: 'Finding connections...',
        emoji: '🔗',
      });
      
      const graphResults = await this.executeGraphTraversal(primaryResults.slice(0, 5), 1); // Depth 1 for speed
      primaryResults.push(...graphResults.slice(0, 10));
    }
    
    // Step 4: Execute expansion searches if needed
    if (primaryResults.length < 5 && searchPlan.expansion.length > 0) {
      await this.emitProgress({
        type: 'searching',
        message: 'Expanding search with related terms...',
        emoji: '🔄',
      });
      
      const expansionResults = await this.executeExpansionSearches(searchPlan, parsedQuery);
      primaryResults.push(...expansionResults);
    }
    
    // Step 5: Organize results
    await this.emitProgress({
      type: 'synthesizing',
      message: 'Finding the most relevant information...',
      emoji: '🎯',
    });
    
    return this.organizeResults(primaryResults);
  }

  private async createSearchPlan(parsedQuery: ParsedQuery): Promise<SearchPlan> {
    const plan: SearchPlan = {
      primary: [],
      expansion: [],
      graphDepth: 2,
      entities: [],
    };
    
    // Always use fast semantic search first
    plan.primary.push({
      strategy: 'semantic',
      params: { 
        limit: 30, // Reduced for speed
        searchAll: true,
      },
    });
    
    // Add keyword search for any meaningful terms found
    const allKeywords = this.extractMeaningfulTerms(parsedQuery);
    if (allKeywords.length > 0) {
      plan.primary.push({
        strategy: 'keyword',
        params: { 
          keywords: allKeywords,
          expandTerms: true,
          searchAll: true,
        },
      });
    }
    
    // Only do expensive AI expansion for complex queries
    if (this.needsExpansion(parsedQuery)) {
      const expansionTerms = await this.generateDynamicExpansions(parsedQuery);
      if (expansionTerms.length > 0) {
        plan.expansion.push({
          strategy: 'keyword',
          params: {
            keywords: expansionTerms.slice(0, 10), // Limit expansion terms
            expandTerms: false,
            searchAll: true,
          },
        });
      }
    }
    
    // Adjust graph depth based on query complexity
    plan.graphDepth = this.determineOptimalGraphDepth(parsedQuery);
    
    // Always search all entities for comprehensive results
    plan.entities = ['profiles', 'posts', 'projects', 'experiences', 'educations', 'skills'];
    
    return plan;
  }

  private extractMeaningfulTerms(parsedQuery: ParsedQuery): string[] {
    const terms = new Set<string>();
    
    // Add all keywords
    parsedQuery.keywords.forEach(k => terms.add(k));
    
    // Add entity values
    parsedQuery.entities.forEach(e => {
      terms.add(e.value.toLowerCase());
      // Also add individual words from multi-word entities
      e.value.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) terms.add(word);
      });
    });
    
    // Extract additional terms from the original query
    const queryWords = parsedQuery.originalQuery.toLowerCase().split(/\s+/);
    queryWords.forEach(word => {
      // Clean and add meaningful words
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 2 && !this.isStopWord(cleaned)) {
        terms.add(cleaned);
      }
    });
    
    return Array.from(terms);
  }

  private async generateDynamicExpansions(parsedQuery: ParsedQuery): Promise<string[]> {
    const expansions = new Set<string>();
    
    // Skip AI expansion for simple queries
    const meaningfulTerms = this.extractMeaningfulTerms(parsedQuery);
    if (meaningfulTerms.length <= 2) {
      return [];
    }
    
    // Only expand the most important terms
    const topTerms = meaningfulTerms.slice(0, 3);
    
    // Quick expansion without full AI context
    for (const term of topTerms) {
      // Basic pattern-based expansion (fast)
      if (term.includes('-')) {
        expansions.add(term.replace(/-/g, ' '));
        expansions.add(term.replace(/-/g, ''));
      }
      if (term.endsWith('s')) {
        expansions.add(term.slice(0, -1));
      }
    }
    
    return Array.from(expansions).slice(0, 5); // Limit expansions
  }

  private determineOptimalGraphDepth(parsedQuery: ParsedQuery): number {
    const query = parsedQuery.originalQuery.toLowerCase();
    
    // Look for relationship indicators
    if (query.includes('connect') || query.includes('relation') || 
        query.includes('network') || query.includes('collaborate')) {
      return 3;
    }
    
    // Look for direct query indicators
    if (query.includes('direct') || query.includes('specific') || 
        query.includes('exactly')) {
      return 1;
    }
    
    // Default depth
    return 2;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'am', 'is', 'are', 'was', 'were'
    ]);
    return stopWords.has(word);
  }
  
  private needsExpansion(parsedQuery: ParsedQuery): boolean {
    // Only expand for queries that really need it
    return (
      parsedQuery.entities.length > 1 && 
      parsedQuery.keywords.length > 2 &&
      !parsedQuery.timeConstraints // Skip expansion for time queries
    );
  }
  
  private isComplexQuery(parsedQuery: ParsedQuery): boolean {
    // Complex queries benefit from AI-powered strategies
    return (
      parsedQuery.entities.length > 2 || // Multiple entities
      parsedQuery.keywords.length > 4 || // Many keywords
      parsedQuery.intent === 'analytical' || // Analytical queries
      parsedQuery.intent === 'exploratory' || // Open-ended queries
      parsedQuery.originalQuery.includes('?') || // Questions
      parsedQuery.originalQuery.split(' ').length > 8 // Long queries
    );
  }

  private determineEntitiesToSearch(parsedQuery: ParsedQuery): string[] {
    // Always search all entities for comprehensive results
    return ['profiles', 'posts', 'projects', 'experiences', 'educations', 'skills'];
  }

  private async executePrimarySearches(plan: SearchPlan, parsedQuery: ParsedQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const search of plan.primary) {
      switch (search.strategy) {
        case 'semantic':
          let semanticQuery = parsedQuery.originalQuery;
          
          // Apply temporal filters if present
          if (parsedQuery.timeConstraints) {
            const timeParams = {
              ...search.params,
              timeConstraints: parsedQuery.timeConstraints,
            };
            const semanticResults = await this.executeTemporalSearch(
              semanticQuery,
              'semantic',
              timeParams
            );
            results.push(...semanticResults);
          } else {
            const semanticResults = await this.semanticSearch.execute(
              semanticQuery,
              search.params
            );
            results.push(...semanticResults);
          }
          break;
          
        case 'keyword':
          if (parsedQuery.timeConstraints) {
            const timeParams = {
              ...search.params,
              timeConstraints: parsedQuery.timeConstraints,
            };
            const keywordResults = await this.executeTemporalSearch(
              parsedQuery.originalQuery,
              'keyword',
              timeParams
            );
            results.push(...keywordResults);
          } else {
            const keywordResults = await this.keywordSearch.execute(
              parsedQuery.originalQuery,
              search.params
            );
            results.push(...keywordResults);
          }
          break;
      }
    }
    
    return results;
  }

  private async executeTemporalSearch(
    query: string, 
    strategy: string, 
    params: any
  ): Promise<SearchResult[]> {
    // Execute the base search
    let results: SearchResult[] = [];
    
    if (strategy === 'semantic') {
      results = await this.semanticSearch.execute(query, params);
    } else if (strategy === 'keyword') {
      results = await this.keywordSearch.execute(query, params);
    }
    
    // Filter by time constraints
    if (params.timeConstraints) {
      const { start, end } = params.timeConstraints;
      
      results = results.filter(result => {
        let dateField: Date | null = null;
        
        // Get the appropriate date field based on result type
        if (result.type === 'post' && result.data.created_at) {
          dateField = new Date(result.data.created_at);
        } else if (result.type === 'project' && result.data.created_at) {
          dateField = new Date(result.data.created_at);
        } else if (result.type === 'experience') {
          // For experiences, check if they overlap with the time range
          if (result.data.start_date) {
            const expStart = new Date(result.data.start_date);
            const expEnd = result.data.end_date ? new Date(result.data.end_date) : new Date();
            
            // Check if experience overlaps with query time range
            if (start && end) {
              return expEnd >= start && expStart <= end;
            }
          }
        }
        
        if (dateField && start && end) {
          return dateField >= start && dateField <= end;
        }
        
        return true; // Include if no date filtering possible
      });
      
      // Update match reasons to include temporal context
      results.forEach(result => {
        result.matchReason += ` (within ${params.timeConstraints.relative || 'specified time period'})`;
      });
    }
    
    return results;
  }

  private async executeExpansionSearches(plan: SearchPlan, parsedQuery: ParsedQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const search of plan.expansion) {
      switch (search.strategy) {
        case 'keyword':
          const keywordResults = await this.keywordSearch.execute(
            parsedQuery.originalQuery,
            search.params
          );
          results.push(...keywordResults);
          break;
      }
    }
    
    return results;
  }

  private async executeGraphTraversal(seedResults: SearchResult[], depth: number): Promise<SearchResult[]> {
    // Extract unique seed entities
    const seedEntities = seedResults
      .slice(0, 10) // Limit to top 10 to avoid explosion
      .map(r => ({ type: r.type, id: r.id }));
    
    const graphResults = await this.graphTraversal.execute('', {
      seedEntities,
      depth,
    });
    
    return graphResults;
  }

  private organizeResults(allResults: SearchResult[]): SearchResults {
    // Deduplicate results
    const uniqueResults = this.deduplicateResults(allResults);
    
    // Organize by type
    const organized: SearchResults = {
      profiles: [],
      posts: [],
      projects: [],
      educations: [],
      experiences: [],
      relationships: [],
    };
    
    for (const result of uniqueResults) {
      switch (result.type) {
        case 'profile':
          organized.profiles.push({
            ...result.data,
            _score: result.relevanceScore,
            _reason: result.matchReason,
          });
          break;
        case 'post':
          organized.posts.push({
            ...result.data,
            _score: result.relevanceScore,
            _reason: result.matchReason,
          });
          break;
        case 'project':
          organized.projects.push({
            ...result.data,
            _score: result.relevanceScore,
            _reason: result.matchReason,
          });
          break;
        case 'experience':
          organized.experiences.push({
            ...result.data,
            _score: result.relevanceScore,
            _reason: result.matchReason,
          });
          break;
        case 'education':
          organized.educations.push({
            ...result.data,
            _score: result.relevanceScore,
            _reason: result.matchReason,
          });
          break;
      }
    }
    
    // Sort by relevance score
    Object.keys(organized).forEach(key => {
      if (Array.isArray(organized[key as keyof SearchResults])) {
        (organized[key as keyof SearchResults] as any[]).sort((a, b) => 
          (b._score || 0) - (a._score || 0)
        );
      }
    });
    
    // Extract relationships from the data
    organized.relationships = this.extractRelationships(organized);
    
    return organized;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();
    
    for (const result of results) {
      const key = `${result.type}:${result.id}`;
      const existing = seen.get(key);
      
      if (!existing || result.relevanceScore > existing.relevanceScore) {
        seen.set(key, result);
      }
    }
    
    return Array.from(seen.values());
  }

  private extractRelationships(results: SearchResults): SearchResults['relationships'] {
    const relationships: SearchResults['relationships'] = [];
    
    // Extract author relationships from posts
    for (const post of results.posts) {
      if (post.author_id) {
        const author = results.profiles.find(p => p.id === post.author_id);
        if (author) {
          relationships.push({
            source: author.id,
            target: post.id,
            type: 'authored',
          });
        }
      }
    }
    
    // Extract contribution relationships
    for (const project of results.projects) {
      if (project.contributions) {
        for (const contrib of project.contributions) {
          relationships.push({
            source: contrib.person_id,
            target: project.id,
            type: 'contributes_to',
          });
        }
      }
    }
    
    return relationships;
  }

  private async emitProgress(update: ProgressUpdate) {
    if (this.progressCallback) {
      await this.progressCallback(update);
    }
    // Progress is emitted only if callback is provided
  }
}