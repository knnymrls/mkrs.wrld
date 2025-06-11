-- Create educations table
CREATE TABLE educations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  degree TEXT NOT NULL,
  year TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create experiences table
CREATE TABLE experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'complete')) DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES profiles(id),
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create contributions table (many-to-many between profiles and projects)
CREATE TABLE contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(person_id, project_id)
);

-- Create links table
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create post_projects junction table
CREATE TABLE post_projects (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, project_id)
);

-- Create post_mentions junction table
CREATE TABLE post_mentions (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, profile_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_educations_profile_id ON educations(profile_id);
CREATE INDEX idx_experiences_profile_id ON experiences(profile_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_contributions_person_id ON contributions(person_id);
CREATE INDEX idx_contributions_project_id ON contributions(project_id);
CREATE INDEX idx_links_profile_id ON links(profile_id);
CREATE INDEX idx_post_projects_post_id ON post_projects(post_id);
CREATE INDEX idx_post_projects_project_id ON post_projects(project_id);
CREATE INDEX idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX idx_post_mentions_profile_id ON post_mentions(profile_id);

-- Enable Row Level Security
ALTER TABLE educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for educations
CREATE POLICY "Users can view all educations" ON educations FOR SELECT USING (true);
CREATE POLICY "Users can insert their own educations" ON educations FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own educations" ON educations FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own educations" ON educations FOR DELETE USING (auth.uid() = profile_id);

-- RLS Policies for experiences
CREATE POLICY "Users can view all experiences" ON experiences FOR SELECT USING (true);
CREATE POLICY "Users can insert their own experiences" ON experiences FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own experiences" ON experiences FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own experiences" ON experiences FOR DELETE USING (auth.uid() = profile_id);

-- RLS Policies for projects
CREATE POLICY "Users can view all projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can insert projects" ON projects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for contributions
CREATE POLICY "Users can view all contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own contributions" ON contributions FOR INSERT WITH CHECK (auth.uid() = person_id);
CREATE POLICY "Project creators can insert contributions" ON contributions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.created_by = auth.uid())
);
CREATE POLICY "Users can update their own contributions" ON contributions FOR UPDATE USING (auth.uid() = person_id);
CREATE POLICY "Users can delete their own contributions" ON contributions FOR DELETE USING (auth.uid() = person_id);

-- RLS Policies for links
CREATE POLICY "Users can view all links" ON links FOR SELECT USING (true);
CREATE POLICY "Users can insert their own links" ON links FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own links" ON links FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own links" ON links FOR DELETE USING (auth.uid() = profile_id);

-- RLS Policies for post_projects
CREATE POLICY "Users can view all post_projects" ON post_projects FOR SELECT USING (true);
CREATE POLICY "Users can insert post_projects for their posts" ON post_projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.profile_id = auth.uid())
);
CREATE POLICY "Users can delete post_projects for their posts" ON post_projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.profile_id = auth.uid())
);

-- RLS Policies for post_mentions
CREATE POLICY "Users can view all post_mentions" ON post_mentions FOR SELECT USING (true);
CREATE POLICY "Users can insert post_mentions for their posts" ON post_mentions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.profile_id = auth.uid())
);
CREATE POLICY "Users can delete post_mentions for their posts" ON post_mentions FOR DELETE USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.profile_id = auth.uid())
);

-- Function to search projects by embedding similarity
CREATE OR REPLACE FUNCTION match_projects(
  embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  created_by uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    projects.id,
    projects.title,
    projects.description,
    projects.status,
    projects.created_by,
    1 - (projects.embedding <=> embedding) AS similarity
  FROM projects
  WHERE projects.embedding <=> embedding < 1 - match_threshold
  ORDER BY projects.embedding <=> embedding
  LIMIT match_count;
$$;