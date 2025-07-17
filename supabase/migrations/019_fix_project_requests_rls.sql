-- Temporarily drop the strict policy and create a more permissive one for testing
DROP POLICY IF EXISTS "Users can create project requests" ON project_requests;

-- Create a more permissive policy that checks if user is authenticated
CREATE POLICY "Authenticated users can create project requests" ON project_requests
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Also update the select policy to be more permissive
DROP POLICY IF EXISTS "Anyone can view open project requests" ON project_requests;

CREATE POLICY "Anyone can view project requests" ON project_requests
    FOR SELECT 
    USING (true);

-- Make sure the created_by field matches the authenticated user
DROP POLICY IF EXISTS "Users can update their own project requests" ON project_requests;

CREATE POLICY "Users can update their own project requests" ON project_requests
    FOR UPDATE 
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Check if the user is properly authenticated
SELECT auth.uid();