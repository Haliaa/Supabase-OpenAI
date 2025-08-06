import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import Header from "../components/Header";
import Footer from "@/components/Footer";
import { useRouter } from "next/router";
import { getBrowserFingerprint, getDeviceInfo } from "../utils/fingerprint";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowLoginPrompt(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      // Get browser fingerprint and device info
      const fingerprint = await getBrowserFingerprint();
      const deviceInfo = getDeviceInfo();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if we have a valid session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          input: userMessage.content,
          fingerprint: fingerprint,
          deviceInfo: deviceInfo
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.reply,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update remaining queries if provided
        if (data.remainingQueries !== undefined) {
          setRemainingQueries(data.remainingQueries);
        }
        
        // Show dev mode indicator if applicable
        if (data.devMode) {
          console.log("Development mode active - using mock responses");
        }
      } else {
        // Handle specific error types
        let errorMessage = data.error || "An error occurred. Please try again.";
        
        if (data.errorType === 'quota_exceeded') {
          errorMessage = "🚫 OpenAI quota exceeded. Please check your billing or try again later.";
        } else if (data.errorType === 'invalid_key') {
          errorMessage = "🔑 OpenAI API key is invalid. Please check your configuration.";
        } else if (data.errorType === 'rate_limit') {
          errorMessage = "⏱️ Rate limit exceeded. Please wait a moment and try again.";
        } else if (res.status === 429) {
          if (data.requiresAuth) {
            errorMessage = "📊 You've used all 3 free requests. Please sign in to get 5 more requests!";
            setShowLoginPrompt(true);
            setRemainingQueries(0); // Set to 0 when limit reached
          } else {
            errorMessage = "📊 Daily limit reached. You've used all your AI requests for today.";
            setRemainingQueries(0); // Set to 0 when limit reached
          }
        }
        
        const errorMessageObj: Message = {
          id: (Date.now() + 1).toString(),
          content: errorMessage,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessageObj]);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "🌐 Network error. Please check your connection and try again.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Header />

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg flex flex-col h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
              AI Chat Assistant
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user ? `Welcome, ${user.email}` : "Ask me anything! You have 3 free questions per day."}
            </p>
            {remainingQueries !== null && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Remaining queries: {Math.max(0, remainingQueries)}
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <p>Start a conversation by typing a message below!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-zinc-700 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600 dark:text-gray-300">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Login Prompt */}
            {showLoginPrompt && (
              <div className="flex justify-center mt-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md">
                  <div className="text-center">
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-3">
                      🎯 You've used all 3 free requests!
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
                      Sign in to get 5 more AI requests and unlock unlimited conversations.
                    </p>
                    <button
                      onClick={handleLoginClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                    >
                      Sign In Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Invisible div for auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={showLoginPrompt ? "Please sign in to continue..." : "Type your message here..."}
                className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-none"
                rows={1}
                disabled={isLoading || showLoginPrompt}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || showLoginPrompt}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {showLoginPrompt ? "Sign in to continue chatting" : "Press Enter to send, Shift+Enter for new line"}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
