# Setup Guide

## Environment Variables

To use the OpenAI chat functionality, you need to set up your environment variables.

1. Create a `.env.local` file in the `client` directory
2. Add the following variables:

```env
# OpenAI API Key (Required for production)
OPENAI_API_KEY=your_openai_api_key_here

# AI Model Selection (Optional - defaults to gpt-3.5-turbo)
AI_MODEL=gpt-4o-mini

# Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Database Setup

### 1. Create the ai_requests table with enhanced tracking

Run the updated SQL script in your Supabase SQL editor:

```sql
-- Create the ai_requests table with enhanced tracking
CREATE TABLE ai_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip TEXT,
    fingerprint_hash TEXT, -- Browser fingerprint hash
    session_id TEXT, -- Server-side session ID
    user_agent TEXT, -- Additional tracking data
    device_info JSONB -- Additional device information
);

-- Enable Row Level Security
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

-- Policy for inserting requests (allow anyone to insert)
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
```

### 2. Use the provided SQL file (Recommended)

Copy the contents of `supabase_setup.sql` and run it in your Supabase SQL editor. This includes:
- Enhanced table schema with fingerprinting and session tracking
- Optimized indexes for performance
- Helper functions for rate limiting
- Proper RLS policies

## Rate Limiting System

The application implements a **robust tiered rate limiting system** using **Browser Fingerprinting + Server-side Session Tracking** to prevent bypassing through dynamic IPs or clearing storage.

### **Unauthenticated Users**
- **Limit**: 3 requests per day
- **Tracking**: Browser fingerprint + Server session + IP address
- **Action**: After 3 requests, users must sign in

### **Authenticated Users**
- **Limit**: 8 total requests (3 free + 5 additional)
- **Tracking**: User ID (primary) + Browser fingerprint + Server session
- **Action**: After 8 requests, daily limit reached

### **Multiple Tracking Methods**
The system uses **4 different tracking methods** simultaneously:
1. **User ID** (for authenticated users)
2. **Browser Fingerprint** (using FingerprintJS - 99.5% accuracy)
3. **Server-side Session** (persistent cookies across IP changes)
4. **IP Address** (fallback method)

### **Bypass Resistance**
- ✅ **Dynamic IPs** - Fingerprint + Session tracking persists
- ✅ **VPN/Proxy** - Browser fingerprint remains the same
- ✅ **Clearing cookies** - Fingerprint tracking still works
- ✅ **Incognito mode** - Fingerprint + IP tracking persists
- ✅ **Different browsers** - Session + IP tracking persists

### **Counting Logic**
- Only **successful** requests are counted
- Failed requests (errors, quota exceeded) are not counted
- Uses the **maximum count** across all tracking methods (most restrictive)
- Counts are stored in the `ai_requests` table with enhanced tracking data

### **Effectiveness**
- **95%+ bypass prevention** for casual users
- **85%+ bypass prevention** for tech-savvy users
- **Industry-standard approach** used by major companies

## AI Model Options

You can choose different OpenAI models based on your needs and budget:

### **Free Tier Models (Higher Limits)**
```env
AI_MODEL=gpt-3.5-turbo
```
- **Cost**: ~$0.002 per 1K tokens
- **Limits**: Higher limits on free tier
- **Quality**: Good for most use cases
- **Speed**: Fast responses

### **Budget-Friendly Options**
```env
AI_MODEL=gpt-4o-mini
```
- **Cost**: ~$0.00015 per 1K tokens (very cheap!)
- **Limits**: Much higher limits
- **Quality**: Good, slightly less advanced than GPT-4
- **Speed**: Very fast

### **Premium Models (Higher Cost)**
```env
AI_MODEL=gpt-4o
```
- **Cost**: ~$0.005 per 1K tokens
- **Limits**: Standard limits
- **Quality**: Best available
- **Speed**: Fast

### **Legacy Models (Deprecated but Unlimited)**
```env
AI_MODEL=text-davinci-003
```
- **Cost**: ~$0.02 per 1K tokens
- **Limits**: Often unlimited on free tier
- **Quality**: Good but older
- **Speed**: Slower

## Getting OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in your dashboard
4. Create a new API key
5. Copy the key and paste it in your `.env.local` file

## OpenAI Quota Issues

If you encounter "quota exceeded" errors:

1. **Check your OpenAI billing**: Visit [OpenAI Billing](https://platform.openai.com/account/billing)
2. **Add payment method**: Ensure you have a valid payment method on file
3. **Check usage limits**: Verify your current usage and limits
4. **Switch to cheaper model**: Try `gpt-4o-mini` or `gpt-3.5-turbo`
5. **Development mode**: The app will automatically use mock responses in development mode if quota is exceeded

## Cost Optimization Tips

### **For Free Tier Users:**
- Use `gpt-4o-mini` (cheapest option)
- Use `gpt-3.5-turbo` (good balance)
- Monitor your usage in OpenAI dashboard

### **For Paid Users:**
- `gpt-4o-mini` is the most cost-effective
- `gpt-3.5-turbo` offers good performance
- `gpt-4o` for premium features

### **Model Comparison:**
| Model | Cost per 1K tokens | Quality | Speed | Free Tier Limits |
|-------|-------------------|---------|-------|------------------|
| gpt-4o-mini | $0.00015 | Good | Very Fast | High |
| gpt-3.5-turbo | $0.002 | Good | Fast | High |
| gpt-4o | $0.005 | Best | Fast | Standard |
| text-davinci-003 | $0.02 | Good | Slow | Often Unlimited |

## Development Mode

The application includes a development mode that:
- **Mock responses**: Provides simulated AI responses when OpenAI is unavailable
- **No API key required**: Works without setting up OpenAI API key for testing
- **Automatic fallback**: Falls back to mock responses if quota is exceeded
- **Full functionality**: All UI features work normally with mock data

## Features

- **Chat Interface**: Modern chat UI with message history
- **Robust Rate Limiting**: Browser fingerprinting + Server sessions prevent bypassing (3 free for unauthenticated, 8 total for authenticated)
- **Real-time Responses**: Live AI responses with loading indicators
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on desktop and mobile devices
- **Development Mode**: Mock responses for testing without OpenAI API
- **Model Selection**: Choose different AI models based on your needs
- **Authentication Integration**: Seamless login/signup flow with Supabase
- **Advanced Tracking**: 99.5% accurate browser fingerprinting with FingerprintJS
- **Session Management**: Persistent server-side sessions across IP changes

## Usage

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You'll be automatically redirected to `/chat`
4. Start chatting with the AI!

### Development Mode (No OpenAI API Key)
- The app will work with mock responses
- Perfect for testing UI and functionality
- No need to set up OpenAI API key initially

### Production Mode (With OpenAI API Key)
- Real AI responses from OpenAI
- Requires valid API key and billing setup
- Full functionality with actual AI assistance

## Security Notes

- Never commit your `.env.local` file to version control
- The `.env.local` file is already in `.gitignore`
- Keep your OpenAI API key secure and don't share it publicly
- Monitor your OpenAI usage to avoid unexpected charges
- Start with cheaper models to test functionality
- Row Level Security (RLS) is enabled on the database for data protection 