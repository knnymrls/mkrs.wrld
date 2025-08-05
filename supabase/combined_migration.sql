-- Combined migration script for new Supabase instance
-- Run this in your SQL Editor

-- First, let's check what tables already exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- If you see any existing tables, you might want to drop them first
-- BE CAREFUL: This will delete all data
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- Now run each migration in order: