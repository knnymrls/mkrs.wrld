-- Create storage buckets for avatars and project images

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('avatars', 'avatars', true, true)
ON CONFLICT (id) DO NOTHING;

-- Create project-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('project-images', 'project-images', true, true)
ON CONFLICT (id) DO NOTHING;

-- Create post-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('post-images', 'post-images', true, true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Set up storage policies for project images
CREATE POLICY "Project images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Users can upload project images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update project images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete project images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

-- Set up storage policies for post images
CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own post images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own post images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );