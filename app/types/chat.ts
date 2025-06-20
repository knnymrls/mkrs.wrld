import { SearchResult } from '@/app/models/Search';

export interface SearchParams {
  limit?: number;
  threshold?: number;
  searchTerms?: string[];
  profileIds?: string[];
  projectIds?: string[];
  depth?: number;
  startDate?: string;
  endDate?: string;
}

export interface SearchStrategy {
  name: string;
  execute(query: string, params?: SearchParams): Promise<SearchResult[]>;
}

export interface SearchPlan {
  primary: {
    strategy: string;
    params?: SearchParams;
  }[];
  expansion: {
    strategy: string;
    params?: SearchParams;
  }[];
  graphDepth: number;
  entities: string[];
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

export interface DataRequestParameters {
  profileIds?: string[];
  projectIds?: string[];
  skills?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface DataRequest {
  type: 'specific_person' | 'recent_activity' | 'project_details' | 'skill_verification' | 'experience_details';
  parameters: DataRequestParameters;
  reason: string;
}