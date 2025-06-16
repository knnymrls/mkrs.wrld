-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can create messages in own sessions" ON chat_messages;

-- Create new RLS policies that work with service role
-- For chat_sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
  );

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
  );

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
  )
  WITH CHECK (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
  );

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  USING (
    auth.uid()::text = user_id::text 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
  );

-- For chat_messages
CREATE POLICY "Users can view messages from own sessions"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND (
      chat_sessions.user_id::text = auth.uid()::text
      OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
    )
  ));

CREATE POLICY "Users can create messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND (
      chat_sessions.user_id::text = auth.uid()::text
      OR
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = chat_sessions.user_id AND profiles.id::text = auth.uid()::text)
    )
  ));

-- Alternative: If using service role, we can also add a policy for service role
CREATE POLICY "Service role can do everything on chat_sessions"
  ON chat_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do everything on chat_messages"
  ON chat_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');