const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes and config
const adminRoutes = require('./routes/admin');
const { supabase } = require('./config/supabase');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CORS_ORIGIN || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5002;

// Store connected users
const connectedUsers = new Map();

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new Error('Invalid authentication token'));
    }

    // Add user info to socket
    console.log("user",user);
    
    socket.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email.split('@')[0],
      role: user.user_metadata?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.email} (${socket.user.id})`);
  
  // Add user to connected users map
  connectedUsers.set(socket.user.id, {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });

  // Join the general chat room
  socket.join('general');
  
  // Emit user joined event
  socket.to('general').emit('user_joined', {
    user: socket.user,
    timestamp: new Date(),
    message: `${socket.user.name} joined the chat`
  });

  // Send current online users to the new user
  const onlineUsers = Array.from(connectedUsers.values()).map(u => u.user);
  socket.emit('online_users', onlineUsers);

  // Handle chat messages
  socket.on('send_message', (data) => {
    const message = {
      id: Date.now().toString(),
      user: socket.user,
      content: data.content,
      timestamp: new Date(),
      type: 'message'
    };

    // Broadcast message to all users in the room
    io.to('general').emit('new_message', message);
    
    console.log(`Message from ${socket.user.email}: ${data.content}`);
  });

  // Handle typing events
  socket.on('typing_start', () => {
    socket.to('general').emit('user_typing', {
      user: socket.user,
      isTyping: true
    });
  });

  socket.on('typing_stop', () => {
    socket.to('general').emit('user_typing', {
      user: socket.user,
      isTyping: false
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.email} (${socket.user.id})`);
    
    // Remove user from connected users
    connectedUsers.delete(socket.user.id);
    
    // Emit user left event
    socket.to('general').emit('user_left', {
      user: socket.user,
      timestamp: new Date(),
      message: `${socket.user.name} left the chat`
    });

    // Update online users for remaining users
    const onlineUsers = Array.from(connectedUsers.values()).map(u => u.user);
    io.to('general').emit('online_users', onlineUsers);
  });
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [process.env.CORS_ORIGIN || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(require('cookie-parser')());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    connectedUsers: connectedUsers.size
  });
});

// API routes
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Chat Server API',
    version: '1.0.0',
    endpoints: {
      admin: '/api/admin',
      health: '/health',
      socket: 'WebSocket connection available'
    },
    documentation: 'Check the README for API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'The provided token is invalid'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'The provided token has expired'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎯 Port ${PORT} | ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO ready on port ${PORT}`);
  
  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('\n⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('\nPlease check your .env file and ensure all required variables are set.');
  } 
  
  console.log('\n🚀 Server is ready!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = { app, server, io }; 