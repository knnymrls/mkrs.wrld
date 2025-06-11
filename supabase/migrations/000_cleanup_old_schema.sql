-- Drop old functions that don't match the new schema
DROP FUNCTION IF EXISTS match_posts(vector, float, int);
DROP FUNCTION IF EXISTS match_profiles(vector, float, int);
DROP FUNCTION IF EXISTS match_projects(vector, float, int);

-- Drop old tables if they exist (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS post_mentions CASCADE;
DROP TABLE IF EXISTS post_projects CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS educations CASCADE;
DROP TABLE IF EXISTS experiences CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop any old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;