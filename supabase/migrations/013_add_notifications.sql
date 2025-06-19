-- Create a comprehensive notification system
-- This migration adds tables and functions for managing notifications

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
  'post_mention',
  'comment_mention',
  'comment_on_post',
  'project_mention',
  'project_added_as_contributor'
);

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Context fields (nullable, depend on notification type)
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = recipient_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = recipient_id);

-- System/triggers will create notifications (no direct user insert)
-- We'll use security definer functions for this

-- Function to create a notification (bypasses RLS)
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Don't create notification if actor is the same as recipient
  IF p_actor_id = p_recipient_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (
    recipient_id, type, title, message, 
    post_id, comment_id, project_id, actor_id, metadata
  ) VALUES (
    p_recipient_id, p_type, p_title, p_message,
    p_post_id, p_comment_id, p_project_id, p_actor_id, p_metadata
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function to create notifications for post mentions
CREATE OR REPLACE FUNCTION notify_post_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
  v_post_preview TEXT;
BEGIN
  -- Get author name
  SELECT name INTO v_author_name 
  FROM profiles 
  WHERE id = NEW.author_id;
  
  -- Get post preview (first 100 chars)
  SELECT LEFT(content, 100) INTO v_post_preview
  FROM posts
  WHERE id = NEW.post_id;

  -- Create notification for profile mentions
  IF EXISTS (SELECT 1 FROM post_mentions WHERE post_id = NEW.post_id) THEN
    INSERT INTO notifications (recipient_id, type, title, message, post_id, actor_id)
    SELECT 
      pm.profile_id,
      'post_mention'::notification_type,
      v_author_name || ' mentioned you in a post',
      v_post_preview || CASE WHEN LENGTH(v_post_preview) >= 100 THEN '...' ELSE '' END,
      NEW.post_id,
      NEW.author_id
    FROM post_mentions pm
    WHERE pm.post_id = NEW.post_id
    AND pm.profile_id != NEW.author_id; -- Don't notify self-mentions
  END IF;

  -- Create notification for project mentions
  IF EXISTS (SELECT 1 FROM post_projects WHERE post_id = NEW.post_id) THEN
    -- Notify project creator
    INSERT INTO notifications (recipient_id, type, title, message, post_id, project_id, actor_id)
    SELECT 
      p.created_by,
      'project_mention'::notification_type,
      v_author_name || ' mentioned your project ' || p.title,
      v_post_preview || CASE WHEN LENGTH(v_post_preview) >= 100 THEN '...' ELSE '' END,
      NEW.post_id,
      pp.project_id,
      NEW.author_id
    FROM post_projects pp
    JOIN projects p ON p.id = pp.project_id
    WHERE pp.post_id = NEW.post_id
    AND p.created_by != NEW.author_id;
    
    -- Notify project contributors
    INSERT INTO notifications (recipient_id, type, title, message, post_id, project_id, actor_id)
    SELECT DISTINCT
      c.person_id,
      'project_mention'::notification_type,
      v_author_name || ' mentioned project ' || p.title,
      v_post_preview || CASE WHEN LENGTH(v_post_preview) >= 100 THEN '...' ELSE '' END,
      NEW.post_id,
      pp.project_id,
      NEW.author_id
    FROM post_projects pp
    JOIN projects p ON p.id = pp.project_id
    JOIN contributions c ON c.project_id = p.id
    WHERE pp.post_id = NEW.post_id
    AND c.person_id != NEW.author_id
    AND c.person_id != p.created_by; -- Don't double notify project creator
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to create notifications for comments on posts
CREATE OR REPLACE FUNCTION notify_comment_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_commenter_name TEXT;
  v_post_author_id UUID;
  v_comment_preview TEXT;
BEGIN
  -- Get commenter name
  SELECT name INTO v_commenter_name 
  FROM profiles 
  WHERE id = NEW.author_id;
  
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Get comment preview
  v_comment_preview := LEFT(NEW.content, 100);
  
  -- Notify post author (unless they're commenting on their own post)
  IF v_post_author_id != NEW.author_id THEN
    PERFORM create_notification(
      v_post_author_id,
      'comment_on_post'::notification_type,
      v_commenter_name || ' commented on your post',
      v_comment_preview || CASE WHEN LENGTH(v_comment_preview) >= 100 THEN '...' ELSE '' END,
      NEW.post_id,
      NEW.id,
      NULL,
      NEW.author_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to create notifications for comment mentions
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
  v_comment_preview TEXT;
BEGIN
  -- Get author name
  SELECT name INTO v_author_name 
  FROM profiles 
  WHERE id = (SELECT author_id FROM post_comments WHERE id = NEW.comment_id);
  
  -- Get comment preview
  SELECT LEFT(content, 100) INTO v_comment_preview
  FROM post_comments
  WHERE id = NEW.comment_id;

  -- Create notification for the mentioned person
  PERFORM create_notification(
    NEW.profile_id,
    'comment_mention'::notification_type,
    v_author_name || ' mentioned you in a comment',
    v_comment_preview || CASE WHEN LENGTH(v_comment_preview) >= 100 THEN '...' ELSE '' END,
    (SELECT post_id FROM post_comments WHERE id = NEW.comment_id),
    NEW.comment_id,
    NULL,
    (SELECT author_id FROM post_comments WHERE id = NEW.comment_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER notify_on_post_create
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_post_mentions();

CREATE TRIGGER notify_on_comment_create
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_comment_on_post();

CREATE TRIGGER notify_on_comment_mention
AFTER INSERT ON comment_mentions
FOR EACH ROW
EXECUTE FUNCTION notify_comment_mentions();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = p_notification_id AND recipient_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE recipient_id = auth.uid() AND read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE recipient_id = auth.uid() AND read = false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;