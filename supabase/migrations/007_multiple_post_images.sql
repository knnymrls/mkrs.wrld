-- Migration to support multiple images per post

-- Create a new table for post images
CREATE TABLE post_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0, -- For ordering images
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_post_images_post_id ON post_images(post_id);
CREATE INDEX idx_post_images_position ON post_images(post_id, position);

-- Enable RLS
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view post images" ON post_images
  FOR SELECT
  USING (true);

CREATE POLICY "Post authors can insert images" ON post_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can delete images" ON post_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND posts.author_id = auth.uid()
    )
  );

-- Migrate existing single images to the new table
INSERT INTO post_images (post_id, url, width, height, position)
SELECT 
  id as post_id,
  image_url as url,
  COALESCE(image_width, 0) as width,
  COALESCE(image_height, 0) as height,
  0 as position
FROM posts
WHERE image_url IS NOT NULL;

-- Keep the old columns for backward compatibility for now
-- They can be dropped in a future migration after the application is updated