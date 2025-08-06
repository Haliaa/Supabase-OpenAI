// pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const UNAUTH_LIMIT = 3; // Max 3 for unauthenticated users
const AUTH_LIMIT = 8; // Max 8 total for authenticated users (3 + 5)
const DEV_MODE = process.env.NODE_ENV === 'development'; // Enable dev mode for testing

// Model configuration - you can change this to use different models
const AI_MODEL = process.env.AI_MODEL || "gpt-3.5-turbo"; // Options: gpt-3.5-turbo, gpt-4o-mini, gpt-4o, text-davinci-003

function getClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? forwarded.split(",")[0]
    : req.socket.remoteAddress || "unknown";
}

// Session management functions
function getSessionId(req: NextApiRequest): string {
  // Try to get session from cookie first
  const sessionCookie = req.cookies['ai_session_id'];
  if (sessionCookie) {
    return sessionCookie;
  }
  
  // Try to get from headers
  const sessionHeader = req.headers['x-session-id'] as string;
  if (sessionHeader) {
    return sessionHeader;
  }
  
  // Generate new session ID
  return randomUUID();
}

function setSessionCookie(res: NextApiResponse, sessionId: string) {
  // Set session cookie for 24 hours
  res.setHeader('Set-Cookie', `ai_session_id=${sessionId}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
}

// Mock responses for development/testing
function getMockResponse(input: string): string {
  const responses = [
    "This is a mock response for development. Your message was: " + input,
    "In development mode, I'm simulating an AI response. You said: " + input,
    "Mock AI response: I understand you're asking about '" + input + "'. This is a test response.",
    "Development mode active. Your query: " + input + " - Here's a simulated helpful response.",
    "Test response: I'm a mock AI assistant responding to: " + input
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { input, fingerprint, deviceInfo } = req.body;
  if (!input || typeof input !== "string") {
    return res.status(400).json({ error: "Missing or invalid input" });
  }

  // Get session ID and set cookie if needed
  const sessionId = getSessionId(req);
  setSessionCookie(res, sessionId);

  // Get Supabase user
  const token = req.headers.authorization?.replace("Bearer ", "");
  let user_id = null;
  let isAuthenticated = false;
  let currentCount = 0; // Declare at function level

  if (token && token.trim() !== "") {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error("Auth error:", error);
        // Don't fail the request for auth errors, just continue as unauthenticated
      } else {
        user_id = data?.user?.id;
        isAuthenticated = true;
      }
    } catch (error) {
      console.error("Auth error:", error);
      // Don't fail the request for auth errors, just continue as unauthenticated
    }
  } else {
    // No valid authorization token provided, continuing as unauthenticated user
  }

  const ip = getClientIp(req);

  // Enhanced rate limiting with multiple tracking methods
  try {
    if (isAuthenticated){      // For authenticated users, check both their authenticated requests AND previous unauthenticated requests
      const [authCount, fingerprintCount, sessionCount, ipCount] = await Promise.all([
        // Count authenticated requests by user_id
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id)
          .then(({ count, error }) => {
            if (error) {
              console.error("Auth count error:", error);
              return 0;
            }
            return count as number;
          }),
        
        // Count previous unauthenticated requests by fingerprint
        fingerprint ? supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("fingerprint_hash", fingerprint)
          .is("user_id", null) // Only count unauthenticated requests
          .then(({ count, error }) => {
            if (error) {
              console.error("Fingerprint count error:", error);
              return 0;
            }
            return count as number;
          }) : Promise.resolve(0),
        
        // Count previous unauthenticated requests by session
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .is("user_id", null) // Only count unauthenticated requests
          .then(({ count, error }) => {
            if (error) {
              console.error("Session count error:", error);
              return 0;
            }
            return count as number;
          }),
        
        // Count previous unauthenticated requests by IP
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("ip", ip)
          .is("user_id", null) // Only count unauthenticated requests
          .then(({ count, error }) => {
            if (error) {
              console.error("IP count error:", error);
              return 0;
            }
            return count as number;
          })
      ]);

      // Total count = authenticated requests + max of unauthenticated requests
      const unauthenticatedCount = Math.max(fingerprintCount, sessionCount, ipCount);
      currentCount = authCount + unauthenticatedCount;

      if (currentCount >= AUTH_LIMIT) {
        return res.status(429).json({ 
          error: "Daily limit reached. You've used all your AI requests for today.",
          remainingQueries: 0,
          limit: AUTH_LIMIT
        });
      }
    } else {
      // For unauthenticated users, use multiple tracking methods
      // Get counts for each tracking method
      const [fingerprintCount, sessionCount, ipCount] = await Promise.all([
        // Count by fingerprint
        fingerprint ? supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("fingerprint_hash", fingerprint)
          .then(({ count, error }) => {
            if (error) {
              console.error("Fingerprint count error:", error);
              return 0;
            }
            return count as number;
          }) : Promise.resolve(0),
        
        // Count by session
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .then(({ count, error }) => {
            if (error) {
              console.error("Session count error:", error);
              return 0;
            }
            return count as number;
          }),
        
        // Count by IP (fallback)
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("ip", ip)
          .then(({ count, error }) => {
            if (error) {
              console.error("IP count error:", error);
              return 0;
            }
            return count as number;
          })
      ]);

      // Use the maximum count (most restrictive)
      currentCount = Math.max(fingerprintCount, sessionCount, ipCount);

      if (currentCount >= UNAUTH_LIMIT) {
        return res.status(429).json({ 
          error: "Free limit reached. Please sign in to continue with 5 more requests.",
          remainingQueries: 0,
          limit: UNAUTH_LIMIT,
          requiresAuth: true
        });
      }
    }
  } catch (error) {
    console.error("Rate limiting error:", error);
    return res.status(500).json({ error: "Rate limiting check failed" });
  }

  // Check if OpenAI API key is configured
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  // Only use mock responses if no OpenAI API key is available
  if (!OPENAI_API_KEY) {
    const mockReply = getMockResponse(input);
    
    // Calculate remaining queries (before counting the current request)
    const remainingQueries = isAuthenticated 
      ? Math.max(0, AUTH_LIMIT - currentCount - 1)
      : Math.max(0, UNAUTH_LIMIT - currentCount - 1);
    
    // Log successful request to database with enhanced tracking
    let insertSuccess = false;
    try {
      const { error: insertErr } = await supabase.from("ai_requests").insert([
        {
          user_id: user_id,
          ip: ip,
          counter: 1,
          fingerprint_hash: fingerprint || null,
          session_id: sessionId,
          user_agent: deviceInfo?.userAgent || req.headers['user-agent'] || null,
          device_info: deviceInfo || null,
        },
      ]);

      if (insertErr) {
        console.error("Failed to log request:", insertErr);
        insertSuccess = false;
      } else {
        insertSuccess = true;
      }
    } catch (dbError) {
      console.error("Database logging error:", dbError);
      insertSuccess = false;
    }

    // If database insertion failed, we need to count this request manually
    if (!insertSuccess) {
      currentCount += 1;
    } else {
      // If insertion was successful, increment the count to reflect the current request
      currentCount += 1;
    }

    return res.status(200).json({ 
      reply: mockReply,
      remainingQueries,
      devMode: true,
      currentCount,
      limit: isAuthenticated ? AUTH_LIMIT : UNAUTH_LIMIT
    });
  }

  // Call OpenAI API
  try {
    
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions."
            },
            { 
              role: "user", 
              content: input 
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json();
      console.error("OpenAI API error:", errorData);
      
      // Handle specific OpenAI errors
      if (errorData.error?.code === 'insufficient_quota') {
        return res.status(503).json({ 
          error: "OpenAI service is currently unavailable due to quota limits. Please check your billing or try again later.",
          errorType: "quota_exceeded"
        });
      } else if (errorData.error?.code === 'invalid_api_key') {
        return res.status(500).json({ 
          error: "OpenAI API key is invalid. Please check your configuration.",
          errorType: "invalid_key"
        });
      } else if (openaiRes.status === 429) {
        return res.status(429).json({ 
          error: "OpenAI rate limit exceeded. Please try again in a few minutes.",
          errorType: "rate_limit"
        });
      } else {
        return res.status(openaiRes.status).json({ 
          error: "OpenAI API error: " + (errorData.error?.message || "Unknown error"),
          errorType: "api_error"
        });
      }
    }

    const json = await openaiRes.json();
    const reply = json?.choices?.[0]?.message?.content || "No response received from AI";

    // Calculate remaining queries (before counting the current request)
    const remainingQueries = isAuthenticated 
      ? Math.max(0, AUTH_LIMIT - currentCount - 1)
      : Math.max(0, UNAUTH_LIMIT - currentCount - 1);

    // Log successful request to database with enhanced tracking (only count successful responses)
    let insertSuccess = false;
    try {
      const { error: insertErr } = await supabase.from("ai_requests").insert([
        {
          user_id: user_id,
          ip: ip,
          counter: 1,
          fingerprint_hash: fingerprint || null,
          session_id: sessionId,
          user_agent: deviceInfo?.userAgent || req.headers['user-agent'] || null,
          device_info: deviceInfo || null,
        },
      ]);

      if (insertErr) {
        console.error("Failed to log request:", insertErr);
        insertSuccess = false;
      } else {
        insertSuccess = true;
      }
    } catch (dbError) {
      console.error("Database logging error:", dbError);
      insertSuccess = false;
    }

    // If database insertion failed, we need to count this request manually
    if (!insertSuccess) {
      currentCount += 1;
    } else {
      // If insertion was successful, increment the count to reflect the current request
      currentCount += 1;
    }

    return res.status(200).json({ 
      reply,
      remainingQueries,
      model: AI_MODEL,
      isAuthenticated,
      currentCount,
      limit: isAuthenticated ? AUTH_LIMIT : UNAUTH_LIMIT
    });
  } catch (err) {
    console.error("OpenAI request error:", err);
    return res.status(500).json({ error: "Failed to contact OpenAI API" });
  }
}
