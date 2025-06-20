-- This migration safely enables RLS with proper policies
-- Run this when you're ready to secure your database

-- Step 1: Create all policies BEFORE enabling RLS
-- This ensures data remains accessible

-- Policies for posts table
DROP POLICY IF EXISTS "Anyone can view all posts" ON posts;
CREATE POLICY "Anyone can view all posts" ON posts
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts
FOR DELETE TO authenticated
USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Step 2: Enable RLS (uncomment when ready)
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Note: To test if everything will work correctly before enabling RLS:
-- 1. Run the policy creation statements above
-- 2. Check that all policies exist: SELECT * FROM pg_policies WHERE tablename = 'posts';
-- 3. Then uncomment and run the ALTER TABLE statement