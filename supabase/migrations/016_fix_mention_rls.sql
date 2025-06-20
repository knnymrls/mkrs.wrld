-- Fix RLS policies for mention tables to match disabled RLS on posts table
-- This ensures mentions are visible when posts RLS is disabled

-- Since posts table has RLS disabled, we need to ensure mention tables
-- can be read by all authenticated users

-- Disable RLS on mention tables to match posts table
ALTER TABLE post_mentions DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other post-related tables for consistency
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_images DISABLE ROW LEVEL SECURITY;

-- If you want to re-enable RLS consistently across all tables, uncomment below:
/*
-- Re-enable RLS on all post-related tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Create consistent policies for all authenticated users to view everything
DROP POLICY IF EXISTS "Anyone can view all posts" ON posts;
CREATE POLICY "Anyone can view all posts" ON posts
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view all post_mentions" ON post_mentions;
CREATE POLICY "Users can view all post_mentions" ON post_mentions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view all post_projects" ON post_projects;
CREATE POLICY "Users can view all post_projects" ON post_projects
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view all post_likes" ON post_likes;
CREATE POLICY "Users can view all post_likes" ON post_likes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view all post_comments" ON post_comments;
CREATE POLICY "Users can view all post_comments" ON post_comments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view all post_images" ON post_images;
CREATE POLICY "Users can view all post_images" ON post_images
FOR SELECT TO authenticated USING (true);

-- Keep write policies restrictive (users can only modify their own content)
-- [Include the existing write policies from migration 014 here if re-enabling RLS]
*/