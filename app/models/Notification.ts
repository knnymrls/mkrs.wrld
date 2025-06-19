export type NotificationType = 
  | 'post_mention'
  | 'comment_mention'
  | 'comment_on_post'
  | 'project_mention'
  | 'project_added_as_contributor';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  read_at?: string | null;
  
  // Context fields
  post_id?: string | null;
  comment_id?: string | null;
  project_id?: string | null;
  actor_id?: string | null;
  
  // Metadata
  metadata?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  
  // Related data (joined from other tables)
  actor?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  project?: {
    id: string;
    title: string;
  };
}