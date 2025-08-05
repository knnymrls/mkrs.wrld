-- Remove division, department, and team fields from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS division,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS team;

-- Remove department and division fields from project_requests table
ALTER TABLE project_requests
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS division;

-- Drop the index that was created for division
DROP INDEX IF EXISTS idx_profiles_division;

-- Update profile embeddings to exclude division/department/team info
-- Note: This would require regenerating embeddings in the application
COMMENT ON TABLE profiles IS 'User profiles without organizational hierarchy fields';
COMMENT ON TABLE project_requests IS 'Project requests without organizational hierarchy fields';