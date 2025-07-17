-- Check what already exists and create only what's missing

-- Check if project_interests table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_interests') THEN
        CREATE TABLE project_interests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            project_request_id UUID REFERENCES project_requests(id) ON DELETE CASCADE NOT NULL,
            interested_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            message TEXT,
            status TEXT CHECK (status IN ('interested', 'selected', 'rejected', 'withdrawn')) DEFAULT 'interested',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(project_request_id, interested_user_id)
        );
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_project_requests_created_by ON project_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_project_requests_status ON project_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_requests_skills ON project_requests USING GIN(skills_needed);
CREATE INDEX IF NOT EXISTS idx_project_requests_division ON project_requests(division);
CREATE INDEX IF NOT EXISTS idx_project_requests_department ON project_requests(department);
CREATE INDEX IF NOT EXISTS idx_project_interests_user ON project_interests(interested_user_id);
CREATE INDEX IF NOT EXISTS idx_project_interests_request ON project_interests(project_request_id);

-- Enable RLS
ALTER TABLE project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_interests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view open project requests" ON project_requests;
DROP POLICY IF EXISTS "Users can create project requests" ON project_requests;
DROP POLICY IF EXISTS "Users can update their own project requests" ON project_requests;
DROP POLICY IF EXISTS "Users can delete their own project requests" ON project_requests;

-- RLS policies for project_requests
CREATE POLICY "Anyone can view open project requests" ON project_requests
    FOR SELECT USING (status = 'open' OR auth.uid() = created_by);

CREATE POLICY "Users can create project requests" ON project_requests
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own project requests" ON project_requests
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own project requests" ON project_requests
    FOR DELETE USING (auth.uid() = created_by);

-- Drop and recreate policies for project_interests
DROP POLICY IF EXISTS "View interests" ON project_interests;
DROP POLICY IF EXISTS "Express interest" ON project_interests;
DROP POLICY IF EXISTS "Update own interest" ON project_interests;
DROP POLICY IF EXISTS "Project owners can update interest status" ON project_interests;
DROP POLICY IF EXISTS "Withdraw interest" ON project_interests;

-- RLS policies for project_interests
CREATE POLICY "View interests" ON project_interests
    FOR SELECT USING (
        auth.uid() = interested_user_id OR 
        auth.uid() IN (
            SELECT created_by FROM project_requests 
            WHERE id = project_request_id
        )
    );

CREATE POLICY "Express interest" ON project_interests
    FOR INSERT WITH CHECK (auth.uid() = interested_user_id);

CREATE POLICY "Update own interest" ON project_interests
    FOR UPDATE USING (auth.uid() = interested_user_id);

CREATE POLICY "Project owners can update interest status" ON project_interests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT created_by FROM project_requests 
            WHERE id = project_request_id
        )
    );

CREATE POLICY "Withdraw interest" ON project_interests
    FOR DELETE USING (auth.uid() = interested_user_id);

-- Add semantic search function (drop and recreate)
DROP FUNCTION IF EXISTS match_project_requests(vector(1536), float, int);

CREATE OR REPLACE FUNCTION match_project_requests(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    skills_needed text[],
    time_commitment text,
    urgency text,
    department text,
    division text,
    status text,
    max_participants integer,
    created_by uuid,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.title,
        pr.description,
        pr.skills_needed,
        pr.time_commitment,
        pr.urgency,
        pr.department,
        pr.division,
        pr.status,
        pr.max_participants,
        pr.created_by,
        pr.created_at,
        1 - (pr.embedding <=> query_embedding) as similarity
    FROM project_requests pr
    WHERE pr.status = 'open'
        AND 1 - (pr.embedding <=> query_embedding) > match_threshold
    ORDER BY pr.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add trigger to update updated_at (only if function doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS update_project_requests_updated_at ON project_requests;
DROP TRIGGER IF EXISTS update_project_interests_updated_at ON project_interests;

CREATE TRIGGER update_project_requests_updated_at BEFORE UPDATE ON project_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_interests_updated_at BEFORE UPDATE ON project_interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();