export interface SearchResult {
  type: 'profile' | 'post' | 'project' | 'education' | 'experience';
  id: string;
  data: any;
  relevanceScore: number;
  matchReason: string;
}

export interface SearchStrategy {
  name: string;
  execute(query: string, params?: any): Promise<SearchResult[]>;
}

export interface SearchPlan {
  primary: {
    strategy: string;
    params?: any;
  }[];
  expansion: {
    strategy: string;
    params?: any;
  }[];
  graphDepth: number;
  entities: string[];
}

export interface SearchResults {
  profiles: any[];
  posts: any[];
  projects: any[];
  educations: any[];
  experiences: any[];
  relationships: {
    source: string;
    target: string;
    type: string;
  }[];
}

export interface ProgressUpdate {
  type: 'analyzing' | 'searching' | 'exploring' | 'synthesizing' | 'requesting_more';
  message: string;
  emoji: string;
}

export interface DataGap {
  type: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface DataRequest {
  type: 'specific_person' | 'recent_activity' | 'project_details' | 'skill_verification' | 'experience_details';
  parameters: any;
  reason: string;
}

export interface Source {
  type: 'profile' | 'project' | 'post';
  id: string;
  name?: string;
  title?: string;
  description?: string;
  preview?: string;
  author?: string;
  relevanceScore: number;
}