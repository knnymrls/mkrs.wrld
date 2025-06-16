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
  // Image fields
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
}