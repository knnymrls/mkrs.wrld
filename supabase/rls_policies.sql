-- Row Level Security Policies for mkrs.world
-- Run this after creating the tables

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = author_id);

-- Post images policies
CREATE POLICY "Post images are viewable by everyone" ON post_images
    FOR SELECT USING (true);

CREATE POLICY "Post authors can add images" ON post_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_images.post_id 
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Post authors can delete images" ON post_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_images.post_id 
            AND posts.author_id = auth.uid()
        )
    );

-- Post likes policies
CREATE POLICY "Post likes are viewable by everyone" ON post_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts" ON post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own likes" ON post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Comments are viewable by everyone" ON post_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON post_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING (auth.uid() = author_id);

-- Skills policies
CREATE POLICY "Skills are viewable by everyone" ON skills
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own skills" ON skills
    FOR ALL USING (auth.uid() = profile_id);

-- Experiences policies
CREATE POLICY "Experiences are viewable by everyone" ON experiences
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own experiences" ON experiences
    FOR ALL USING (auth.uid() = profile_id);

-- Educations policies
CREATE POLICY "Educations are viewable by everyone" ON educations
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own educations" ON educations
    FOR ALL USING (auth.uid() = profile_id);

-- Links policies
CREATE POLICY "Links are viewable by everyone" ON links
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own links" ON links
    FOR ALL USING (auth.uid() = profile_id);

-- Projects policies
CREATE POLICY "Projects are viewable by everyone" ON projects
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators can update their projects" ON projects
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Project creators can delete their projects" ON projects
    FOR DELETE USING (auth.uid() = created_by);

-- Contributions policies
CREATE POLICY "Contributions are viewable by everyone" ON contributions
    FOR SELECT USING (true);

CREATE POLICY "Project creators can manage contributions" ON contributions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = contributions.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Mentions policies
CREATE POLICY "Post mentions are viewable by everyone" ON post_mentions
    FOR SELECT USING (true);

CREATE POLICY "Post authors can create mentions" ON post_mentions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_mentions.post_id 
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Post projects are viewable by everyone" ON post_projects
    FOR SELECT USING (true);

CREATE POLICY "Post authors can add project mentions" ON post_projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_projects.post_id 
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Comment mentions are viewable by everyone" ON comment_mentions
    FOR SELECT USING (true);

CREATE POLICY "Comment authors can create mentions" ON comment_mentions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM post_comments 
            WHERE post_comments.id = comment_mentions.comment_id 
            AND post_comments.author_id = auth.uid()
        )
    );

CREATE POLICY "Comment project mentions are viewable by everyone" ON comment_project_mentions
    FOR SELECT USING (true);

CREATE POLICY "Comment authors can create project mentions" ON comment_project_mentions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM post_comments 
            WHERE post_comments.id = comment_project_mentions.comment_id 
            AND post_comments.author_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = recipient_id);

-- Project requests policies
CREATE POLICY "Project requests are viewable by everyone" ON project_requests
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create project requests" ON project_requests
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own project requests" ON project_requests
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own project requests" ON project_requests
    FOR DELETE USING (auth.uid() = created_by);

-- Project interests policies
CREATE POLICY "Project request creators can view interests" ON project_interests
    FOR SELECT USING (
        auth.uid() = interested_user_id OR
        EXISTS (
            SELECT 1 FROM project_requests 
            WHERE project_requests.id = project_interests.project_request_id 
            AND project_requests.created_by = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can express interest" ON project_interests
    FOR INSERT WITH CHECK (auth.uid() = interested_user_id);

CREATE POLICY "Users can update own interests" ON project_interests
    FOR UPDATE USING (auth.uid() = interested_user_id);

CREATE POLICY "Users can delete own interests" ON project_interests
    FOR DELETE USING (auth.uid() = interested_user_id);