-- Add mention tracking for comments
-- This migration adds tables to track @mentions in comments (both people and projects)

-- Table to track profile mentions in comments
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, profile_id)
);

-- Table to track project mentions in comments
CREATE TABLE IF NOT EXISTS comment_project_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, project_id)
);

-- Create indexes for performance
CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX idx_comment_mentions_profile_id ON comment_mentions(profile_id);
CREATE INDEX idx_comment_project_mentions_comment_id ON comment_project_mentions(comment_id);
CREATE INDEX idx_comment_project_mentions_project_id ON comment_project_mentions(project_id);

-- Enable Row Level Security
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_project_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_mentions
-- Anyone can view comment mentions
CREATE POLICY "Comment mentions are viewable by everyone" 
ON comment_mentions FOR SELECT 
USING (true);

-- Only the comment author can create mentions (enforced via comment creation)
CREATE POLICY "Users can create comment mentions for their own comments" 
ON comment_mentions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM post_comments 
    WHERE post_comments.id = comment_id 
    AND post_comments.author_id = auth.uid()
  )
);

-- Only the comment author can delete mentions (when editing comment)
CREATE POLICY "Users can delete comment mentions for their own comments" 
ON comment_mentions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM post_comments 
    WHERE post_comments.id = comment_id 
    AND post_comments.author_id = auth.uid()
  )
);

-- RLS Policies for comment_project_mentions (same pattern)
CREATE POLICY "Comment project mentions are viewable by everyone" 
ON comment_project_mentions FOR SELECT 
USING (true);

CREATE POLICY "Users can create project mentions for their own comments" 
ON comment_project_mentions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM post_comments 
    WHERE post_comments.id = comment_id 
    AND post_comments.author_id = auth.uid()
  )
);

CREATE POLICY "Users can delete project mentions for their own comments" 
ON comment_project_mentions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM post_comments 
    WHERE post_comments.id = comment_id 
    AND post_comments.author_id = auth.uid()
  )
);