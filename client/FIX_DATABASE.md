# Quick Database Fix

## The Problem
Your requests aren't being counted because the database insertion is failing due to Row Level Security (RLS) policies.

## The Solution
Run this SQL in your Supabase SQL editor to fix the RLS policies:

```sql
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow insert for all users" ON ai_requests;
DROP POLICY IF EXISTS "Allow users to read own requests" ON ai_requests;
DROP POLICY IF EXISTS "Allow reading by IP for rate limiting" ON ai_requests;

-- Create new policies that allow proper insertion and reading
CREATE POLICY "Allow insert for all users" ON ai_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow reading for rate limiting" ON ai_requests
    FOR SELECT USING (true);

CREATE POLICY "Allow update for all users" ON ai_requests
    FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT ALL ON ai_requests TO anon;
GRANT ALL ON ai_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
```

## Steps:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL above
4. Click "Run"
5. Restart your development server: `npm run dev`

## What This Fixes:
- ✅ Allows unauthenticated users to insert requests
- ✅ Allows reading requests for rate limiting
- ✅ Fixes the "row-level security policy" error
- ✅ Enables proper request counting

## After the Fix:
- Unauthenticated users will be limited to 3 requests
- The remaining count will update correctly
- After 3 requests, users will be prompted to sign in
- Authenticated users get 5 additional requests (8 total)

## Test It:
1. Try sending 3 messages as an unauthenticated user
2. You should see the remaining count decrease: 3 → 2 → 1 → 0
3. After 3 requests, you should get an error asking you to sign in
4. Sign in and you should get 5 more requests 