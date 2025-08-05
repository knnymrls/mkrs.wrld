-- Disable RLS on all tables and drop all policies
-- WARNING: This removes all security restrictions on your database

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE experiences DISABLE ROW LEVEL SECURITY;
ALTER TABLE educations DISABLE ROW LEVEL SECURITY;
ALTER TABLE links DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_mentions DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions DISABLE ROW LEVEL SECURITY;
ALTER TABLE comment_project_mentions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_interests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop all existing policies on posts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Drop all existing policies on post_images
DROP POLICY IF EXISTS "Post images are viewable by everyone" ON post_images;
DROP POLICY IF EXISTS "Post authors can add images" ON post_images;
DROP POLICY IF EXISTS "Post authors can delete images" ON post_images;

-- Drop all existing policies on post_likes
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can remove own likes" ON post_likes;

-- Drop all existing policies on post_comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- Drop all existing policies on skills
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON skills;

-- Drop all existing policies on experiences
DROP POLICY IF EXISTS "Experiences are viewable by everyone" ON experiences;
DROP POLICY IF EXISTS "Users can manage own experiences" ON experiences;

-- Drop all existing policies on educations
DROP POLICY IF EXISTS "Educations are viewable by everyone" ON educations;
DROP POLICY IF EXISTS "Users can manage own educations" ON educations;

-- Drop all existing policies on links
DROP POLICY IF EXISTS "Links are viewable by everyone" ON links;
DROP POLICY IF EXISTS "Users can manage own links" ON links;

-- Drop all existing policies on projects
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators can update their projects" ON projects;
DROP POLICY IF EXISTS "Project creators can delete their projects" ON projects;

-- Drop all existing policies on contributions
DROP POLICY IF EXISTS "Contributions are viewable by everyone" ON contributions;
DROP POLICY IF EXISTS "Project creators can manage contributions" ON contributions;

-- Drop all existing policies on chat_sessions
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

-- Drop all existing policies on chat_messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create messages in own sessions" ON chat_messages;

-- Drop all existing policies on post_mentions
DROP POLICY IF EXISTS "Post mentions are viewable by everyone" ON post_mentions;
DROP POLICY IF EXISTS "Post authors can create mentions" ON post_mentions;

-- Drop all existing policies on post_projects
DROP POLICY IF EXISTS "Post projects are viewable by everyone" ON post_projects;
DROP POLICY IF EXISTS "Post authors can add project mentions" ON post_projects;

-- Drop all existing policies on comment_mentions
DROP POLICY IF EXISTS "Comment mentions are viewable by everyone" ON comment_mentions;
DROP POLICY IF EXISTS "Comment authors can create mentions" ON comment_mentions;

-- Drop all existing policies on comment_project_mentions
DROP POLICY IF EXISTS "Comment project mentions are viewable by everyone" ON comment_project_mentions;
DROP POLICY IF EXISTS "Comment authors can create project mentions" ON comment_project_mentions;

-- Drop all existing policies on notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Drop all existing policies on project_requests
DROP POLICY IF EXISTS "Project requests are viewable by everyone" ON project_requests;
DROP POLICY IF EXISTS "Authenticated users can create project requests" ON project_requests;
DROP POLICY IF EXISTS "Users can update own project requests" ON project_requests;
DROP POLICY IF EXISTS "Users can delete own project requests" ON project_requests;

-- Drop all existing policies on project_interests
DROP POLICY IF EXISTS "Project request creators can view interests" ON project_interests;
DROP POLICY IF EXISTS "Authenticated users can express interest" ON project_interests;
DROP POLICY IF EXISTS "Users can update own interests" ON project_interests;
DROP POLICY IF EXISTS "Users can delete own interests" ON project_interests;