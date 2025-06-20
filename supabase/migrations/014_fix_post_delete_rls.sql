-- Enable RLS on posts table if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create a policy that allows users to delete their own posts
CREATE POLICY "Users can delete their own posts" ON posts
FOR DELETE 
TO authenticated
USING (auth.uid() = author_id);

-- Also ensure users can select all posts
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
CREATE POLICY "Users can view all posts" ON posts
FOR SELECT 
TO authenticated
USING (true);

-- Ensure users can insert their own posts
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Ensure users can update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE 
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Enable RLS on related tables
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Create policies for post_mentions
DROP POLICY IF EXISTS "Users can view all post_mentions" ON post_mentions;
CREATE POLICY "Users can view all post_mentions" ON post_mentions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create post_mentions" ON post_mentions;
CREATE POLICY "Users can create post_mentions" ON post_mentions
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete post_mentions" ON post_mentions;
CREATE POLICY "Users can delete post_mentions" ON post_mentions
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);

-- Similar policies for post_projects
DROP POLICY IF EXISTS "Users can view all post_projects" ON post_projects;
CREATE POLICY "Users can view all post_projects" ON post_projects
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create post_projects" ON post_projects;
CREATE POLICY "Users can create post_projects" ON post_projects
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete post_projects" ON post_projects;
CREATE POLICY "Users can delete post_projects" ON post_projects
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);

-- Policies for post_likes
DROP POLICY IF EXISTS "Users can view all post_likes" ON post_likes;
CREATE POLICY "Users can view all post_likes" ON post_likes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create their own likes" ON post_likes;
CREATE POLICY "Users can create their own likes" ON post_likes
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON post_likes;
CREATE POLICY "Users can delete their own likes" ON post_likes
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Policies for post_comments
DROP POLICY IF EXISTS "Users can view all post_comments" ON post_comments;
CREATE POLICY "Users can view all post_comments" ON post_comments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON post_comments;
CREATE POLICY "Users can create comments" ON post_comments
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
CREATE POLICY "Users can delete their own comments" ON post_comments
FOR DELETE TO authenticated 
USING (auth.uid() = author_id);

-- Policies for post_images
DROP POLICY IF EXISTS "Users can view all post_images" ON post_images;
CREATE POLICY "Users can view all post_images" ON post_images
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create post_images" ON post_images;
CREATE POLICY "Users can create post_images" ON post_images
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete post_images" ON post_images;
CREATE POLICY "Users can delete post_images" ON post_images
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_id 
    AND posts.author_id = auth.uid()
  )
);