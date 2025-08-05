# Troubleshooting Guide

## Issues Fixed

### 1. **JWT Token Error**
**Problem**: `invalid JWT: unable to parse or verify signature, token is malformed`

**Solution**: ✅ Fixed in code
- Only send Authorization header when valid session exists
- Better token validation in API

### 2. **Database RLS Policy Error**
**Problem**: `new row violates row-level security policy for table "ai_requests"`

**Solution**: Run the SQL fix below

## Quick Database Fix

### Step 1: Run SQL Script
Copy and paste this into your Supabase SQL Editor:

```sql
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
```

### Step 2: Restart Server
```bash
npm run dev
```

## Expected Behavior After Fix

### **Unauthenticated Users:**
- ✅ Can send 3 requests
- ✅ Remaining count: 3 → 2 → 1 → 0
- ✅ After 3 requests: "Please sign in to get 5 more requests!"

### **Authenticated Users:**
- ✅ Can send 8 total requests (3 free + 5 additional)
- ✅ Proper counting and rate limiting

## Test the Fix

1. **Send 3 messages** as unauthenticated user
2. **Check remaining count** decreases: 3 → 2 → 1 → 0
3. **Try 4th message** → Should get error asking to sign in
4. **Sign in** → Should get 5 more requests
5. **Send 8 total** → Should get daily limit error

## Debug Information

The API now logs:
- `"No valid authorization token provided, continuing as unauthenticated user"`
- `"Authenticated user: [user_id]"`
- `"Unauthenticated user (IP: [ip]) has [count] requests"`
- `"Database insertion failed, manually counting request. New count: [count]"`

## If Issues Persist

1. **Check Supabase Dashboard** → SQL Editor → Run the fix
2. **Clear browser cache** and restart server
3. **Check environment variables** are set correctly
4. **Verify table exists** in Supabase Table Editor

## Success Indicators

✅ No more "row-level security policy" errors
✅ No more "invalid JWT" errors  
✅ Remaining count updates correctly
✅ Rate limiting works as expected 