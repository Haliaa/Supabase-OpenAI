// pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const UNAUTH_LIMIT = 3; // Lifetime limit for unauthenticated users
const AUTH_BONUS_LIMIT = 3; // Bonus requests if not used while unauthenticated
const AUTH_DAILY_LIMIT = 5; // Daily limit for authenticated users
const DEV_MODE = process.env.NODE_ENV === 'development';

const AI_MODEL = process.env.AI_MODEL || "gpt-3.5-turbo";

function getClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? forwarded.split(",")[0]
    : req.socket.remoteAddress || "unknown";
}

function getSessionId(req: NextApiRequest): string {
  const sessionCookie = req.cookies['ai_session_id'];
  if (sessionCookie) {
    return sessionCookie;
  }
  
  const sessionHeader = req.headers['x-session-id'] as string;
  if (sessionHeader) {
    return sessionHeader;
  }
  
  return randomUUID();
}

function setSessionCookie(res: NextApiResponse, sessionId: string) {
  res.setHeader('Set-Cookie', `ai_session_id=${sessionId}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
}

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

  const sessionId = getSessionId(req);
  setSessionCookie(res, sessionId);

  const token = req.headers.authorization?.replace("Bearer ", "");
  let user_id = null;
  let isAuthenticated = false;
  let currentCount = 0;
  let remainingQueries = 0;

  if (token && token.trim() !== "") {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error("Auth error:", error);
      } else {
        user_id = data?.user?.id;
        isAuthenticated = true;
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  }

  const ip = getClientIp(req);

  try {
    if (isAuthenticated) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [authTodayCount, unauthenticatedCount] = await Promise.all([
        // Count authenticated requests today
        supabase
          .from("ai_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id)
          .gte("created_at", today.toISOString())
          .then(({ count, error }) => {
            if (error) {
              console.error("Auth today count error:", error);
              return 0;
            }
            return count as number;
          }),
        
        // Count previous unauthenticated requests
        Promise.all([
          fingerprint ? supabase
            .from("ai_requests")
            .select("*", { count: "exact", head: true })
            .eq("fingerprint_hash", fingerprint)
            .is("user_id", null)
            .then(({ count, error }) => {
              if (error) {
                console.error("Fingerprint count error:", error);
                return 0;
              }
              return count as number;
            }) : Promise.resolve(0),
          
          supabase
            .from("ai_requests")
            .select("*", { count: "exact", head: true })
            .eq("session_id", sessionId)
            .is("user_id", null)
            .then(({ count, error }) => {
              if (error) {
                console.error("Session count error:", error);
                return 0;
              }
              return count as number;
            }),
          
          supabase
            .from("ai_requests")
            .select("*", { count: "exact", head: true })
            .eq("ip", ip)
            .is("user_id", null)
            .then(({ count, error }) => {
              if (error) {
                console.error("IP count error:", error);
                return 0;
              }
              return count as number;
            })
        ]).then(counts => Math.max(...counts))
      ]);

      // Calculate available requests
      const usedUnauthenticated = unauthenticatedCount;
      const usedAuthenticatedToday = authTodayCount;
      
      // Bonus requests: 3 if never used while unauthenticated
      const bonusRequests = usedUnauthenticated === 0 ? AUTH_BONUS_LIMIT : 0;
      
      // Daily limit: 5 per day
      const dailyRemaining = Math.max(0, AUTH_DAILY_LIMIT - usedAuthenticatedToday);
      
      // Total remaining = bonus + daily
      remainingQueries = bonusRequests + dailyRemaining;
      currentCount = usedAuthenticatedToday;
      
      if (remainingQueries <= 0) {
        return res.status(429).json({ 
          error: "Daily limit reached. You've used all your AI requests for today.",
          remainingQueries: 0,
          limit: AUTH_DAILY_LIMIT
        });
      }
    } else {
      // For unauthenticated users: 3 lifetime requests
      const [fingerprintCount, sessionCount, ipCount] = await Promise.all([
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

      currentCount = Math.max(fingerprintCount, sessionCount, ipCount);
      remainingQueries = Math.max(0, UNAUTH_LIMIT - currentCount - 1);

      if (currentCount >= UNAUTH_LIMIT) {
        return res.status(429).json({ 
          error: "Lifetime limit reached. Please sign in to continue with daily requests.",
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

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  if (!OPENAI_API_KEY) {
    const mockReply = getMockResponse(input);
    
    let insertSuccess = false;
    try {
      const { error: insertErr } = await supabase.from("ai_requests").insert([
        {
          user_id: user_id,
          ip: ip,
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

    if (!insertSuccess) {
      currentCount += 1;
    } else {
      currentCount += 1;
    }

    return res.status(200).json({ 
      reply: mockReply,
      remainingQueries,
      devMode: true,
      currentCount,
      limit: isAuthenticated ? AUTH_DAILY_LIMIT : UNAUTH_LIMIT
    });
  }

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

    let insertSuccess = false;
    try {
      const { error: insertErr } = await supabase.from("ai_requests").insert([
        {
          user_id: user_id,
          ip: ip,
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

    if (!insertSuccess) {
      currentCount += 1;
    } else {
      currentCount += 1;
    }

    return res.status(200).json({ 
      reply,
      remainingQueries,
      model: AI_MODEL,
      isAuthenticated,
      currentCount,
      limit: isAuthenticated ? AUTH_DAILY_LIMIT : UNAUTH_LIMIT
    });
  } catch (err) {
    console.error("OpenAI request error:", err);
    return res.status(500).json({ error: "Failed to contact OpenAI API" });
  }
}
