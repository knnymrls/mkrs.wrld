import { 
  SearchPlan, 
  SearchResults, 
  SearchResult, 
  ProgressUpdate 
} from '../types';
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

  constructor(progressCallback?: (update: ProgressUpdate) => void | Promise<void>) {
    this.progressCallback = progressCallback;
  }

  async retrieveInformation(query: string): Promise<SearchResults> {
    // Step 1: Analyze query
    await this.emitProgress({
      type: 'analyzing',
      message: 'Analyzing your query...',
      emoji: '🔍',
    });
    
    const parsedQuery = this.queryParser.parse(query);
    const searchPlan = this.createSearchPlan(parsedQuery);
    
    // Step 2: Execute primary searches
    await this.emitProgress({
      type: 'searching',
      message: 'Searching across profiles, posts, and projects...',
      emoji: '📊',
    });
    
    const primaryResults = await this.executePrimarySearches(searchPlan, parsedQuery);
    
    // Step 3: Graph traversal if we have seed entities
    if (primaryResults.length > 0) {
      await this.emitProgress({
        type: 'exploring',
        message: 'Exploring connections and relationships...',
        emoji: '🕸️',
      });
      
      const graphResults = await this.executeGraphTraversal(primaryResults, searchPlan.graphDepth);
      primaryResults.push(...graphResults);
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

  private createSearchPlan(parsedQuery: ParsedQuery): SearchPlan {
    const plan: SearchPlan = {
      primary: [],
      expansion: [],
      graphDepth: 2,
      entities: [],
    };
    
    // Always include semantic search as primary
    plan.primary.push({
      strategy: 'semantic',
      params: { limit: 30 },
    });
    
    // Add keyword search if we have good keywords
    if (parsedQuery.keywords.length > 0) {
      plan.primary.push({
        strategy: 'keyword',
        params: { 
          keywords: parsedQuery.keywords,
          expandTerms: true,
        },
      });
    }
    
    // Plan expansion searches based on intent
    switch (parsedQuery.intent) {
      case 'find_people':
        // Expand with role and skill variations
        const skills = parsedQuery.entities
          .filter(e => e.type === 'skill')
          .map(e => e.value);
        
        if (skills.length > 0) {
          const expandedSkills = skills.flatMap(skill => 
            this.entityExpander.getAllSearchTerms(skill)
          );
          
          plan.expansion.push({
            strategy: 'keyword',
            params: {
              keywords: expandedSkills,
              expandTerms: false, // Already expanded
            },
          });
        }
        
        // If looking for software developers specifically
        if (parsedQuery.originalQuery.toLowerCase().includes('software')) {
          const softwareTerms = this.entityExpander.expandSoftwareQuery(parsedQuery.originalQuery);
          plan.expansion.push({
            strategy: 'keyword',
            params: {
              keywords: softwareTerms,
              expandTerms: false,
            },
          });
        }
        break;
        
      case 'find_projects':
        plan.graphDepth = 1; // Less depth for project searches
        break;
        
      case 'find_relationships':
        plan.graphDepth = 3; // More depth for relationship queries
        break;
    }
    
    // Determine which entities to search
    plan.entities = this.determineEntitiesToSearch(parsedQuery);
    
    return plan;
  }

  private determineEntitiesToSearch(parsedQuery: ParsedQuery): string[] {
    const entities = ['profiles', 'posts', 'projects'];
    
    // Add specific entities based on intent
    switch (parsedQuery.intent) {
      case 'find_people':
        entities.push('experiences', 'educations', 'skills');
        break;
      case 'find_knowledge':
        entities.push('experiences');
        break;
    }
    
    return entities;
  }

  private async executePrimarySearches(plan: SearchPlan, parsedQuery: ParsedQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const search of plan.primary) {
      switch (search.strategy) {
        case 'semantic':
          const semanticResults = await this.semanticSearch.execute(
            parsedQuery.originalQuery,
            search.params
          );
          results.push(...semanticResults);
          break;
          
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