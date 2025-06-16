-- Add CASCADE DELETE to foreign key constraints

-- Drop existing foreign key constraints
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
ALTER TABLE post_mentions DROP CONSTRAINT IF EXISTS post_mentions_post_id_fkey;
ALTER TABLE post_projects DROP CONSTRAINT IF EXISTS post_projects_post_id_fkey;

-- Re-add foreign key constraints with CASCADE DELETE
ALTER TABLE post_comments 
  ADD CONSTRAINT post_comments_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES posts(id) 
  ON DELETE CASCADE;

ALTER TABLE post_likes 
  ADD CONSTRAINT post_likes_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES posts(id) 
  ON DELETE CASCADE;

ALTER TABLE post_mentions 
  ADD CONSTRAINT post_mentions_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES posts(id) 
  ON DELETE CASCADE;

ALTER TABLE post_projects 
  ADD CONSTRAINT post_projects_post_id_fkey 
  FOREIGN KEY (post_id) 
  REFERENCES posts(id) 
  ON DELETE CASCADE;