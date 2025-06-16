-- Add image fields to profiles and projects tables

-- Add avatar_url to profiles
ALTER TABLE profiles 
ADD COLUMN avatar_url TEXT;

-- Add image_url to projects
ALTER TABLE projects
ADD COLUMN image_url TEXT;

-- Update RLS policies to allow users to update their own avatar
CREATE POLICY "Users can update own avatar" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);