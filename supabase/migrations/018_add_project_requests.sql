-- Create project_requests table for internal project marketplace
CREATE TABLE project_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    skills_needed TEXT[] DEFAULT '{}',
    time_commitment TEXT CHECK (time_commitment IN ('few_hours', 'few_days', 'week', 'few_weeks', 'month', 'months')),
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')) DEFAULT 'medium',
    department TEXT,
    division TEXT,
    status TEXT CHECK (status IN ('open', 'in_review', 'filled', 'cancelled')) DEFAULT 'open',
    max_participants INTEGER DEFAULT 1,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_interests table to track who's interested
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

-- Create indexes for performance
CREATE INDEX idx_project_requests_created_by ON project_requests(created_by);
CREATE INDEX idx_project_requests_status ON project_requests(status);
CREATE INDEX idx_project_requests_skills ON project_requests USING GIN(skills_needed);
CREATE INDEX idx_project_requests_division ON project_requests(division);
CREATE INDEX idx_project_requests_department ON project_requests(department);
CREATE INDEX idx_project_interests_user ON project_interests(interested_user_id);
CREATE INDEX idx_project_interests_request ON project_interests(project_request_id);

-- Enable RLS
ALTER TABLE project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_requests
-- Everyone can view open project requests
CREATE POLICY "Anyone can view open project requests" ON project_requests
    FOR SELECT USING (status = 'open' OR auth.uid() = created_by);

-- Users can create their own project requests
CREATE POLICY "Users can create project requests" ON project_requests
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own project requests
CREATE POLICY "Users can update their own project requests" ON project_requests
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own project requests
CREATE POLICY "Users can delete their own project requests" ON project_requests
    FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for project_interests
-- Users can view interests on their own project requests or their own interests
CREATE POLICY "View interests" ON project_interests
    FOR SELECT USING (
        auth.uid() = interested_user_id OR 
        auth.uid() IN (
            SELECT created_by FROM project_requests 
            WHERE id = project_request_id
        )
    );

-- Users can express interest
CREATE POLICY "Express interest" ON project_interests
    FOR INSERT WITH CHECK (auth.uid() = interested_user_id);

-- Users can update their own interests
CREATE POLICY "Update own interest" ON project_interests
    FOR UPDATE USING (auth.uid() = interested_user_id);

-- Project owners can update interest status
CREATE POLICY "Project owners can update interest status" ON project_interests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT created_by FROM project_requests 
            WHERE id = project_request_id
        )
    );

-- Users can withdraw their interest
CREATE POLICY "Withdraw interest" ON project_interests
    FOR DELETE USING (auth.uid() = interested_user_id);

-- Add semantic search function for project requests
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

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_requests_updated_at BEFORE UPDATE ON project_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_interests_updated_at BEFORE UPDATE ON project_interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();