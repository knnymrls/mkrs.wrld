-- Fix duplicate notifications for comments
-- This migration updates the comment mention notification to avoid duplicates

-- Update the comment mention notification function to check if the user is already being notified as post author
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
  v_comment_preview TEXT;
  v_post_author_id UUID;
  v_comment_author_id UUID;
BEGIN
  -- Get comment author id
  SELECT author_id INTO v_comment_author_id 
  FROM post_comments 
  WHERE id = NEW.comment_id;
  
  -- Get author name
  SELECT name INTO v_author_name 
  FROM profiles 
  WHERE id = v_comment_author_id;
  
  -- Get post author
  SELECT p.author_id INTO v_post_author_id
  FROM posts p
  JOIN post_comments pc ON pc.post_id = p.id
  WHERE pc.id = NEW.comment_id;
  
  -- Get comment preview
  SELECT LEFT(content, 100) INTO v_comment_preview
  FROM post_comments
  WHERE id = NEW.comment_id;

  -- Only create notification if:
  -- 1. The mentioned person is not the comment author (no self-mentions)
  -- 2. The mentioned person is not the post author (they already get a comment notification)
  IF NEW.profile_id != v_comment_author_id AND 
     (NEW.profile_id != v_post_author_id OR v_post_author_id = v_comment_author_id) THEN
    PERFORM create_notification(
      NEW.profile_id,
      'comment_mention'::notification_type,
      v_author_name || ' mentioned you in a comment',
      v_comment_preview || CASE WHEN LENGTH(v_comment_preview) >= 100 THEN '...' ELSE '' END,
      (SELECT post_id FROM post_comments WHERE id = NEW.comment_id),
      NEW.comment_id,
      NULL,
      v_comment_author_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update the comment on post notification to be more specific
CREATE OR REPLACE FUNCTION notify_comment_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_commenter_name TEXT;
  v_post_author_id UUID;
  v_comment_preview TEXT;
  v_has_mentions BOOLEAN;
BEGIN
  -- Get commenter name
  SELECT name INTO v_commenter_name 
  FROM profiles 
  WHERE id = NEW.author_id;
  
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Check if post author is mentioned in this comment
  SELECT EXISTS(
    SELECT 1 FROM comment_mentions 
    WHERE comment_id = NEW.id AND profile_id = v_post_author_id
  ) INTO v_has_mentions;
  
  -- Get comment preview
  v_comment_preview := LEFT(NEW.content, 100);
  
  -- Notify post author only if:
  -- 1. They're not commenting on their own post
  -- 2. They're not already being notified via mention
  IF v_post_author_id != NEW.author_id AND NOT v_has_mentions THEN
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