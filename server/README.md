# AI Chat Server

A secure Express.js backend server for the AI Chat Assistant application with Supabase authentication and comprehensive admin functionality.

## 🚀 Features

### Core Functionality
- **Express.js REST API** with comprehensive security middleware
- **Supabase Integration** for authentication and database operations
- **Role-based Access Control** (Admin/User roles)
- **Rate Limiting** to prevent abuse
- **Security Headers** with Helmet.js
- **CORS Configuration** for cross-origin requests
- **Request Logging** with Morgan
- **Health Check Endpoints** for monitoring

### Admin Panel Features
- **User Management**: View, update roles, and delete users
- **Analytics Dashboard**: System usage statistics and metrics
- **Real-time Monitoring**: User activity and request tracking
- **Secure Admin Routes**: Protected by authentication and role verification

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Security**: Helmet.js, CORS, Rate Limiting
- **Logging**: Morgan
- **Development**: Nodemon

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Environment variables configured

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the server root directory:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Security Configuration
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Environment mode | No | development |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | No | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |
| `CORS_ORIGIN` | Allowed CORS origin | No | http://localhost:3000 |

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server health status and uptime information.

### Root Endpoint
```
GET /
```
Returns API information and available endpoints.

### Admin Routes

All admin routes require authentication and admin privileges.

#### Get All Users
```
GET /api/admin/users
```
**Headers**: `Authorization: Bearer <token>`

Returns a list of all registered users with their details.

**Response**:
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "last_sign_in_at": "2024-01-01T12:00:00Z",
      "user_metadata": {
        "name": "John Doe",
        "role": "user"
      },
      "role": "user"
    }
  ],
  "total": 1
}
```

#### Get User Details
```
GET /api/admin/users/:userId
```
**Headers**: `Authorization: Bearer <token>`

Returns detailed information about a specific user including chat history.

**Response**:
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "last_sign_in_at": "2024-01-01T12:00:00Z",
    "user_metadata": {
      "name": "John Doe",
      "role": "user"
    },
    "role": "user",
    "chatHistory": [...],
    "totalRequests": 5
  }
}
```

#### Update User Role
```
PUT /api/admin/users/:userId/role
```
**Headers**: `Authorization: Bearer <token>`
**Body**:
```json
{
  "role": "admin"
}
```

Updates a user's role (user/admin).

**Response**:
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### Delete User
```
DELETE /api/admin/users/:userId
```
**Headers**: `Authorization: Bearer <token>`

Deletes a user account. Cannot delete your own account.

**Response**:
```json
{
  "message": "User deleted successfully"
}
```

#### Get Analytics
```
GET /api/admin/analytics?period=30d
```
**Headers**: `Authorization: Bearer <token>`

Returns system analytics and usage statistics.

**Query Parameters**:
- `period`: Time period for analytics (7d, 30d, 90d, all)

**Response**:
```json
{
  "analytics": {
    "totalRequests": 150,
    "uniqueUsers": 25,
    "topUsers": [...],
    "requestsByDay": [...],
    "averageRequestsPerUser": 6
  }
}
```

#### System Health Check
```
GET /api/admin/health
```
**Headers**: `Authorization: Bearer <token>`

Returns detailed system health information.

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "memory": {
    "used": "50MB",
    "total": "512MB"
  }
}
```

## 🔒 Security Features

### Authentication
- **Supabase JWT Tokens**: Secure token-based authentication
- **Role-based Access**: Admin and user role verification
- **Token Validation**: Automatic token verification on protected routes

### Rate Limiting
- **IP-based Limiting**: Prevents abuse from individual IPs
- **Configurable Limits**: Adjustable request limits and time windows
- **Standard Headers**: Rate limit information in response headers

### Security Headers
- **Helmet.js**: Comprehensive security headers
- **CORS Protection**: Configurable cross-origin resource sharing
- **Content Security Policy**: XSS protection
- **HTTPS Enforcement**: Secure connection requirements

## 🏗 Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   └── admin.js             # Admin API routes
│   ├── utils/                   # Utility functions
│   └── index.js                 # Main server file
├── package.json
├── .env                         # Environment variables
└── README.md
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Setup for Production
1. Set `NODE_ENV=production`
2. Configure production Supabase credentials
3. Set appropriate CORS origins
4. Configure rate limiting for production load
5. Set up monitoring and logging

## 🔍 Monitoring

### Health Checks
- **Endpoint**: `/health`
- **Response Time**: < 100ms
- **Uptime Monitoring**: Available via uptime field

### Logging
- **Development**: Morgan dev format
- **Production**: Morgan combined format
- **Error Logging**: Automatic error capture and logging

## 🛠 Development

### Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run build`: Build step (not required for Node.js)

### Adding New Routes
1. Create route file in `src/routes/`
2. Import and use in `src/index.js`
3. Add authentication middleware as needed
4. Update documentation

### Testing
```bash
# Run tests (when implemented)
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Check server logs for errors
- Verify environment variables
- Ensure Supabase credentials are correct

## 🔄 Version History

- **v1.0.0**: Initial release with admin functionality
- Basic user management
- Analytics dashboard
- Security middleware
- Rate limiting
