-- First, let's check if the posts are still there by temporarily disabling RLS
-- This will make all posts visible again
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Check if posts still exist (run this query separately to verify)
-- SELECT COUNT(*) FROM posts;

-- If you want to re-enable RLS with proper policies, uncomment below:
/*
-- Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for viewing posts
DROP POLICY IF EXISTS "Anyone can view all posts" ON posts;
CREATE POLICY "Anyone can view all posts" ON posts
FOR SELECT 
TO authenticated, anon
USING (true);

-- Users can only delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts
FOR DELETE 
TO authenticated
USING (auth.uid() = author_id);

-- Users can only create posts as themselves
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Users can only update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE 
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
*/