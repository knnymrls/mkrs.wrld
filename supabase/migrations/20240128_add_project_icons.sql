-- Add icon field to projects table
ALTER TABLE projects 
ADD COLUMN icon TEXT DEFAULT 'Folder';
