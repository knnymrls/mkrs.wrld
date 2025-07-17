import { Profile } from './Profile';
import { Post } from './Post';
import { Project } from './Project';
import { Education } from './Education';
import { Experience } from './Experience';
import { ProjectRequest } from './ProjectRequest';

export type SearchResultData = Profile | Post | Project | Education | Experience | ProjectRequest;

export interface SearchResult {
  type: 'profile' | 'post' | 'project' | 'education' | 'experience' | 'project_request';
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
  projectRequests: ProjectRequest[];
  relationships: {
    source: string;
    target: string;
    type: string;
  }[];
}

export interface Source {
  type: 'profile' | 'project' | 'post' | 'project_request';
  id: string;
  name?: string;
  title?: string;
  description?: string;
  preview?: string;
  author?: string;
  relevanceScore: number;
}