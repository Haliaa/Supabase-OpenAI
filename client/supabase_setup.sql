-- Supabase Setup for AI Requests Table with Browser Fingerprinting + Server Sessions
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow insert for all users" ON ai_requests;
DROP POLICY IF EXISTS "Allow users to read own requests" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading by IP for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading for rate limiting" ON ai_requests;
DROP POLICY IF EXISTS "Allow update for all users" ON ai_requests;

-- Drop existing table to recreate with new schema
DROP TABLE IF EXISTS ai_requests;

-- Create the ai_requests table with enhanced tracking
CREATE TABLE ai_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    counter INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip TEXT,
    -- New fields for robust tracking
    fingerprint_hash TEXT, -- Browser fingerprint hash
    session_id TEXT, -- Server-side session ID
    user_agent TEXT, -- Additional tracking data
    device_info JSONB -- Additional device information
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_ip ON ai_requests(ip);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_requests_fingerprint ON ai_requests(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_ai_requests_session ON ai_requests(session_id);

-- Function to get request count by fingerprint
CREATE OR REPLACE FUNCTION get_fingerprint_request_count(fingerprint TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM ai_requests WHERE fingerprint_hash = fingerprint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get request count by session
CREATE OR REPLACE FUNCTION get_session_request_count(session TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM ai_requests WHERE session_id = session);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get request count by user
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

-- Function to get request count by IP
CREATE OR REPLACE FUNCTION get_ip_request_count(ip_address TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM ai_requests WHERE ip = ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get maximum request count across all tracking methods
CREATE OR REPLACE FUNCTION get_max_request_count(
    user_uuid UUID DEFAULT NULL,
    fingerprint TEXT DEFAULT NULL,
    session TEXT DEFAULT NULL,
    ip_address TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    user_count INTEGER := 0;
    fingerprint_count INTEGER := 0;
    session_count INTEGER := 0;
    ip_count INTEGER := 0;
BEGIN
    -- Get counts for each tracking method
    IF user_uuid IS NOT NULL THEN
        user_count := get_user_request_count(user_uuid);
    END IF;
    
    IF fingerprint IS NOT NULL THEN
        fingerprint_count := get_fingerprint_request_count(fingerprint);
    END IF;
    
    IF session IS NOT NULL THEN
        session_count := get_session_request_count(session);
    END IF;
    
    IF ip_address IS NOT NULL THEN
        ip_count := get_ip_request_count(ip_address);
    END IF;
    
    -- Return the maximum count (most restrictive)
    RETURN GREATEST(user_count, fingerprint_count, session_count, ip_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON ai_requests TO anon;
GRANT ALL ON ai_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated; 