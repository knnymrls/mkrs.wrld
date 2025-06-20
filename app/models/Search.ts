import { Profile } from './Profile';
import { Post } from './Post';
import { Project } from './Project';
import { Education } from './Education';
import { Experience } from './Experience';

export type SearchResultData = Profile | Post | Project | Education | Experience;

export interface SearchResult {
  type: 'profile' | 'post' | 'project' | 'education' | 'experience';
  id: string;
  data: SearchResultData;
  relevanceScore: number;
  matchReason: string;
}

export interface SearchResults {
  profiles: Profile[];
  posts: Post[];
  projects: Project[];
  educations: Education[];
  experiences: Experience[];
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