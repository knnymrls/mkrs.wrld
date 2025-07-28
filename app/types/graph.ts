import { Profile } from '@/app/models/Profile';
import { Post } from '@/app/models/Post';
import { Project } from '@/app/models/Project';
import { Skill } from '@/app/models/Skill';
import { PostMention, PostProject } from '@/app/models/Post';
import { Contribution } from '@/app/models/Project';

// Node types for the force graph
export interface BaseNode {
  id: string;
  type: 'profile' | 'post' | 'project';
  group: number;
  value: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  __img?: HTMLImageElement;
}

export interface ProfileNode extends BaseNode {
  type: 'profile';
  label: string;
  bio?: string;
  avatar_url?: string;
  title?: string;
  location?: string;
  skills?: string[];
  division?: string;
  department?: string;
  team?: string;
}

export interface PostNode extends BaseNode {
  type: 'post';
  label: string;
  author_id?: string;
  authorName?: string;
  created_at?: string;
}

export interface ProjectNode extends BaseNode {
  type: 'project';
  label: string;
  status?: 'active' | 'paused' | 'complete';
  description?: string;
  icon?: string;
}

export type GraphNode = ProfileNode | PostNode | ProjectNode;

// Link types for the force graph
export interface Link {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'authored' | 'mentioned' | 'mentioned_project' | 'contributes_to';
  value: number;
}

// Graph data structure
export interface GraphData {
  nodes: GraphNode[];
  links: Link[];
}

// Force graph instance type
export interface ForceGraphInstance {
  d3Force: (forceName: string, force?: any) => any;
  zoom: (k: number, duration?: number) => void;
  centerAt: (x?: number, y?: number, duration?: number) => void;
  __img?: HTMLImageElement;
}