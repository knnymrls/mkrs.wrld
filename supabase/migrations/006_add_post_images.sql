-- Add image support to posts table

-- Add image_url column to posts
ALTER TABLE posts 
ADD COLUMN image_url TEXT;

-- Add image metadata columns
ALTER TABLE posts
ADD COLUMN image_width INTEGER,
ADD COLUMN image_height INTEGER;

-- Create index for posts with images
CREATE INDEX idx_posts_with_images ON posts(created_at DESC) WHERE image_url IS NOT NULL;