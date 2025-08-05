-- Supabase Setup for AI Requests Table
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow insert for all users" ON ai_requests;
DROP POLICY IF EXISTS "Allow users to read own requests" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading by IP for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow update for all users" ON ai_requests;

-- Create the ai_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    counter INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip TEXT
);

-- Enable Row Level Security
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

-- Policy for inserting requests (allow anyone to insert, including unauthenticated users)
CREATE POLICY "Allow insert for all users" ON ai_requests
    FOR INSERT WITH CHECK (true);

-- Policy for reading requests (allow reading for rate limiting purposes)
CREATE POLICY "Allow reading for rate limiting" ON ai_requests
    FOR SELECT USING (true);

-- Policy for updating requests (if needed)
CREATE POLICY "Allow update for all users" ON ai_requests
    FOR UPDATE USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_ip ON ai_requests(ip);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);

-- Optional: Create a function to get request count for a user
CREATE OR REPLACE FUNCTION get_user_request_count(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
    IF user_uuid IS NOT NULL THEN
        RETURN (SELECT COUNT(*) FROM ai_requests WHERE user_id = user_uuid);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a function to get request count by IP
CREATE OR REPLACE FUNCTION get_ip_request_count(ip_address TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM ai_requests WHERE ip = ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON ai_requests TO anon;
GRANT ALL ON ai_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated; 