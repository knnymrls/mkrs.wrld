import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/app/models/Profile';
import { Post, PostImage, PostMention, PostProject } from '@/app/models/Post';
import { Project, Contribution } from '@/app/models/Project';
import { Education } from '@/app/models/Education';
import { Experience } from '@/app/models/Experience';
import { Skill } from '@/app/models/Skill';
import { SocialLink } from '@/app/models/SocialLink';
import { ChatMessage, ChatSession } from '@/app/models/chat';
import { Notification } from '@/app/models/Notification';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'created_at'>;
        Update: Partial<Omit<Post, 'id'>>;
      };
      post_images: {
        Row: PostImage;
        Insert: Omit<PostImage, 'id'>;
        Update: Partial<Omit<PostImage, 'id'>>;
      };
      post_mentions: {
        Row: PostMention;
        Insert: PostMention;
        Update: Partial<PostMention>;
      };
      post_projects: {
        Row: PostProject;
        Insert: PostProject;
        Update: Partial<PostProject>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id'>>;
      };
      contributions: {
        Row: Contribution;
        Insert: Omit<Contribution, 'id' | 'created_at'>;
        Update: Partial<Omit<Contribution, 'id'>>;
      };
      educations: {
        Row: Education;
        Insert: Omit<Education, 'id' | 'created_at'>;
        Update: Partial<Omit<Education, 'id'>>;
      };
      experiences: {
        Row: Experience;
        Insert: Omit<Experience, 'id' | 'created_at'>;
        Update: Partial<Omit<Experience, 'id'>>;
      };
      skills: {
        Row: Skill;
        Insert: Omit<Skill, 'id' | 'created_at'>;
        Update: Partial<Omit<Skill, 'id'>>;
      };
      social_links: {
        Row: SocialLink;
        Insert: Omit<SocialLink, 'id' | 'created_at'>;
        Update: Partial<Omit<SocialLink, 'id'>>;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatSession, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id'>>;
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
        };
        Update: Partial<{
          post_id: string;
          user_id: string;
        }>;
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<{
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
        }, 'id' | 'created_at'>;
        Update: Partial<Omit<{
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
        }, 'id'>>;
      };
    };
    Functions: {
      match_posts: {
        Args: {
          query_embedding: number[];
          similarity_threshold: number;
          match_count: number;
        };
        Returns: Array<Post & { similarity: number }>;
      };
      match_profiles: {
        Args: {
          query_embedding: number[];
          similarity_threshold: number;
          match_count: number;
        };
        Returns: Array<Profile & { similarity: number }>;
      };
      match_projects: {
        Args: {
          query_embedding: number[];
          similarity_threshold: number;
          match_count: number;
        };
        Returns: Array<Project & { similarity: number }>;
      };
    };
  };
}

export type TypedSupabaseClient = SupabaseClient<Database>;