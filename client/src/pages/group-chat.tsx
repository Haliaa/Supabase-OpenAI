import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import { supabase } from "../services/supabaseClient";
import { ArrowLeft, Users, MessageCircle } from "lucide-react";
import Header from "../components/Header";

interface Message {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  content: string;
  timestamp: Date;
  type: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TypingUser {
  user: User;
  isTyping: boolean;
}

export default function GroupChat() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuthAndConnect();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const checkAuthAndConnect = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);
      await connectToSocket(user);
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication failed');
      setIsLoading(false);
    }
  };

  const connectToSocket = async (user: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('No session found. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('Session token available:', !!session.access_token);
      console.log('User ID:', user.id);
      console.log('User email:', user.email);

      console.log('Attempting to connect to Socket.IO server...');

      // Create Socket.IO connection with authentication
      const socketInstance = io('http://localhost:5002', {
        auth: {
          token: session.access_token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      // Connection events
      socketInstance.on('connect', () => {
        console.log('Connected to Socket.IO server');
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Failed to connect to chat server';
        
        if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timeout. Please check if the server is running.';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to server. Please ensure the server is running on port 5002.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          setError('Disconnected by server. Please refresh the page.');
        }
      });

      // Chat events
      socketInstance.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      socketInstance.on('user_joined', (data: any) => {
        const systemMessage: Message = {
          id: Date.now().toString(),
          user: {
            id: 'system',
            email: 'system',
            name: 'System',
            role: 'system'
          },
          content: data.message,
          timestamp: new Date(data.timestamp),
          type: 'system'
        };
        setMessages(prev => [...prev, systemMessage]);
      });

      socketInstance.on('user_left', (data: any) => {
        const systemMessage: Message = {
          id: Date.now().toString(),
          user: {
            id: 'system',
            email: 'system',
            name: 'System',
            role: 'system'
          },
          content: data.message,
          timestamp: new Date(data.timestamp),
          type: 'system'
        };
        setMessages(prev => [...prev, systemMessage]);
      });

      socketInstance.on('online_users', (users: User[]) => {
        setOnlineUsers(users);
      });

      socketInstance.on('user_typing', (data: TypingUser) => {
        setTypingUsers(prev => {
          const filtered = prev.filter(t => t.user.id !== data.user.id);
          if (data.isTyping) {
            return [...filtered, data];
          }
          return filtered;
        });
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('Socket connection error:', error);
      setError('Failed to connect to chat server. Please try again.');
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socket || !isConnected) return;

    socket.emit('send_message', { content: messageInput.trim() });
    setMessageInput("");
  };

  const handleTyping = () => {
    if (!socket || !isConnected) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('typing_start');

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop');
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connection Error</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                checkAuthAndConnect();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry Connection
            </button>
            <button
              onClick={() => router.push('/ask-ai')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Header />
      
      {/* Chat Header */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-gray-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/ask-ai')}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors duration-200"
                title="Back to Ask AI"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle size={24} className="text-blue-600 dark:text-blue-400" />
                  Group Chat
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Users size={14} />
                    {onlineUsers.length} online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Online Users Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Online Users</h2>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                    {user.role === 'admin' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">Admin</span>
                    )}
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No users online</p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow flex flex-col h-[600px] border border-gray-200 dark:border-zinc-700">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.user.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'system' 
                        ? 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 text-center mx-auto'
                        : message.user.id === currentUser?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-white'
                    }`}>
                      {message.type !== 'system' && (
                        <div className="text-xs opacity-75 mb-1">
                          {message.user.name}
                          {message.user.role === 'admin' && (
                            <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 py-0.5 rounded text-xs">Admin</span>
                          )}
                        </div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      <div className={`text-xs mt-1 ${
                        message.type === 'system' 
                          ? 'text-gray-500 dark:text-gray-400' 
                          : message.user.id === currentUser?.id 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg">
                      <div className="text-sm">
                        {typingUsers.map(t => t.user.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-zinc-700 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!isConnected}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || !isConnected}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 