const { supabase } = require('../config/supabase');

// Simplified middleware that uses Supabase tokens directly
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const { data: user, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found or token expired'
      });
    }

    // Add user info to request
    req.user = {
      id: user.user.id,
      email: user.user.email,
      role: user.user.user_metadata?.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Invalid authentication token'
    });
  }
};

// Optional auth middleware
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const { data: user, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.user = {
        id: user.user.id,
        email: user.user.email,
        role: user.user.user_metadata?.role || 'user'
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
}; 