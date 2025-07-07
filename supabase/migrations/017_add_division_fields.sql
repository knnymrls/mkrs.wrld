-- Add division, department, and team fields to profiles table
ALTER TABLE profiles
ADD COLUMN division TEXT,
ADD COLUMN department TEXT,
ADD COLUMN team TEXT;

-- Create index for division to improve filtering performance
CREATE INDEX idx_profiles_division ON profiles(division);

-- Update RLS policies to include new fields (no changes needed, existing policies cover all columns)

-- Add some comments for documentation
COMMENT ON COLUMN profiles.division IS 'Main organizational division (e.g., Catalyst, NBS, NDS, Corporate)';
COMMENT ON COLUMN profiles.department IS 'Department within the division';
COMMENT ON COLUMN profiles.team IS 'Specific team name within the department';