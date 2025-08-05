-- Quick Fix for RLS Policies
-- Run this in your Supabase SQL editor

-- First, disable RLS temporarily to clear any issues
ALTER TABLE ai_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow insert for all users" ON ai_requests;
DROP POLICY IF EXISTS "Allow users to read own requests" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading by IP for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow update for all users" ON ai_requests;

-- Re-enable RLS
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for the rate limiting system
CREATE POLICY "Allow all operations for rate limiting" ON ai_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON ai_requests TO anon;
GRANT ALL ON ai_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_requests';

-- Check if policies are created
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'ai_requests'; 