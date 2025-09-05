export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          bio: string | null
          location: string | null
          title: string | null
          avatar_url: string | null
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email?: string | null
          bio?: string | null
          location?: string | null
          title?: string | null
          avatar_url?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          bio?: string | null
          location?: string | null
          title?: string | null
          avatar_url?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          content: string
          image_url: string | null
          image_width: number | null
          image_height: number | null
          created_at: string
          likes_count: number
          comments_count: number
          user_has_liked?: boolean
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          image_url?: string | null
          image_width?: number | null
          image_height?: number | null
          created_at?: string
          likes_count?: number
          comments_count?: number
        }
        Update: {
          id?: string
          author_id?: string
          content?: string
          image_url?: string | null
          image_width?: number | null
          image_height?: number | null
          created_at?: string
          likes_count?: number
          comments_count?: number
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
      }
      post_likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      comment_mentions: {
        Row: {
          comment_id: string
          profile_id: string
        }
        Insert: {
          comment_id: string
          profile_id: string
        }
        Update: {
          comment_id?: string
          profile_id?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: string
          post_id: string | null
          comment_id: string | null
          project_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: string
          post_id?: string | null
          comment_id?: string | null
          project_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: string
          post_id?: string | null
          comment_id?: string | null
          project_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'active' | 'paused' | 'complete'
          icon: string | null
          created_by: string
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'active' | 'paused' | 'complete'
          icon?: string | null
          created_by: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'active' | 'paused' | 'complete'
          icon?: string | null
          created_by?: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      contributions: {
        Row: {
          id: string
          person_id: string
          project_id: string
          role: string
          description: string | null
          start_date: string
          end_date: string | null
        }
        Insert: {
          id?: string
          person_id: string
          project_id: string
          role: string
          description?: string | null
          start_date: string
          end_date?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          project_id?: string
          role?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
        }
      }
      skills: {
        Row: {
          id: string
          profile_id: string
          skill: string
        }
        Insert: {
          id?: string
          profile_id: string
          skill: string
        }
        Update: {
          id?: string
          profile_id?: string
          skill?: string
        }
      }
      post_mentions: {
        Row: {
          post_id: string
          profile_id: string
        }
        Insert: {
          post_id: string
          profile_id: string
        }
        Update: {
          post_id?: string
          profile_id?: string
        }
      }
      post_projects: {
        Row: {
          post_id: string
          project_id: string
        }
        Insert: {
          post_id: string
          project_id: string
        }
        Update: {
          post_id?: string
          project_id?: string
        }
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          url: string
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          url: string
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          url?: string
          width?: number | null
          height?: number | null
          created_at?: string
        }
      }
      educations: {
        Row: {
          id: string
          profile_id: string
          school: string
          degree: string
          year: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          school: string
          degree: string
          year?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          school?: string
          degree?: string
          year?: string | null
          created_at?: string
        }
      }
      experiences: {
        Row: {
          id: string
          profile_id: string
          company: string
          role: string
          description: string | null
          start_date: string
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company: string
          role: string
          description?: string | null
          start_date: string
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company?: string
          role?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          created_at?: string
        }
      }
      social_links: {
        Row: {
          id: string
          profile_id: string
          platform: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          platform: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          platform?: string
          url?: string
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          content: string
          role: 'user' | 'assistant'
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          content: string
          role: 'user' | 'assistant'
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          content?: string
          role?: 'user' | 'assistant'
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}