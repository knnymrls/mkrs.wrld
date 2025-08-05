-- Remove division, department, and team fields from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS division,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS team;

-- Remove division and department fields from project_requests table
ALTER TABLE project_requests
DROP COLUMN IF EXISTS division,
DROP COLUMN IF EXISTS department;