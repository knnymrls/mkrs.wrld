export interface SearchResult {
  type: 'profile' | 'post' | 'project' | 'education' | 'experience';
  id: string;
  data: any;
  relevanceScore: number;
  matchReason: string;
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