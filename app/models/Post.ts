export interface PostImage {
  id: string;
  url: string;
  width: number;
  height: number;
  position: number;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  mentions: Array<{ 
    id: string; 
    name: string; 
    type: 'person' | 'project'; 
    imageUrl?: string | null 
  }>;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  // Legacy single image fields (for backward compatibility)
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  // New multiple images support
  images?: PostImage[];
}

export interface PostProject {
  post_id: string;
  project_id: string;
  created_at: string;
}

export interface PostMention {
  post_id: string;
  profile_id: string;
  created_at: string;
}