const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message
      });
    }

    // Filter out sensitive information
    const safeUsers = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
      role: user.role || 'user'
    }));

    res.json({
      users: safeUsers,
      total: safeUsers.length
    });

  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID (admin only)
router.get('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      return res.status(404).json({
        error: 'User not found',
        message: error.message
      });
    }

    // Get user's chat history
    const { data: chatHistory, error: historyError } = await supabase
      .from("ai_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const safeUser = {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at,
      last_sign_in_at: user.user.last_sign_in_at,
      user_metadata: user.user.user_metadata,
      role: user.user.role || 'user',
      chatHistory: chatHistory || [],
      totalRequests: chatHistory?.length || 0
    };

    res.json({ user: safeUser });

  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user details'
    });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "user" or "admin"'
      });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    });

    if (error) {
      return res.status(400).json({
        error: 'Update failed',
        message: error.message
      });
    }

    res.json({
      message: 'User role updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'user'
      }
    });

  } catch (error) {
    console.error('Admin role update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user role'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(400).json({
        error: 'Delete failed',
        message: error.message
      });
    }

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user'
    });
  }
});

// Get analytics (admin only)
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get total requests in period
    const { count: totalRequests, error: requestsError } = await supabase
      .from("ai_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    if (requestsError) {
      console.error('Analytics requests error:', requestsError);
    }

    // Get unique users in period
    const { data: uniqueUsers, error: usersError } = await supabase
      .from("ai_requests")
      .select("user_id")
      .gte("created_at", startDate.toISOString())
      .not("user_id", "is", null);

    if (usersError) {
      console.error('Analytics users error:', usersError);
    }

    const uniqueUserCount = uniqueUsers ? new Set(uniqueUsers.map(u => u.user_id)).size : 0;

    // Get requests by day
    const { data: dailyRequests, error: dailyError } = await supabase
      .from("ai_requests")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (dailyError) {
      console.error('Analytics daily error:', dailyError);
    }

    // Group by day
    const dailyStats = {};
    if (dailyRequests) {
      dailyRequests.forEach(request => {
        const date = new Date(request.created_at).toISOString().split('T')[0];
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });
    }

    // Get top users by request count
    const { data: topUsers, error: topUsersError } = await supabase
      .from("ai_requests")
      .select("user_id, created_at")
      .gte("created_at", startDate.toISOString())
      .not("user_id", "is", null);

    if (topUsersError) {
      console.error('Analytics top users error:', topUsersError);
    }

    const userRequestCounts = {};
    if (topUsers) {
      topUsers.forEach(request => {
        userRequestCounts[request.user_id] = (userRequestCounts[request.user_id] || 0) + 1;
      });
    }

    const topUserIds = Object.entries(userRequestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId]) => userId);

    // Get user details for top users
    const topUsersWithDetails = [];
    for (const userId of topUserIds) {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      if (user) {
        topUsersWithDetails.push({
          id: user.user.id,
          email: user.user.email,
          name: user.user.user_metadata?.name,
          requestCount: userRequestCounts[userId]
        });
      }
    }

    res.json({
      period,
      startDate: startDate.toISOString(),
      analytics: {
        totalRequests: totalRequests || 0,
        uniqueUsers: uniqueUserCount,
        averageRequestsPerUser: uniqueUserCount > 0 ? Math.round((totalRequests || 0) / uniqueUserCount * 100) / 100 : 0,
        dailyStats,
        topUsers: topUsersWithDetails
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch analytics'
    });
  }
});

// Get system health (admin only)
router.get('/health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check database connection
    const { data: dbTest, error: dbError } = await supabase
      .from("ai_requests")
      .select("id", { count: "exact", head: true });

    // Check auth service
    const { data: authTest, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 });

    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        database: {
          status: dbError ? 'unhealthy' : 'healthy',
          error: dbError?.message
        },
        auth: {
          status: authError ? 'unhealthy' : 'healthy',
          error: authError?.message
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    // Overall status
    const hasErrors = dbError || authError;
    health.status = hasErrors ? 'degraded' : 'healthy';

    res.json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router; 