# Environment Variables Setup

## Overview
This document outlines all the environment variables that need to be configured for the CourtSync application.

## Backend Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```bash
# Flask Configuration
FLASK_CONFIG=development  # Options: development, production, default

# Server Configuration
HOST=127.0.0.1
PORT=5000

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# Database Configuration
DEV_DATABASE_URL=sqlite:///court_sync_dev.db
DATABASE_URL=sqlite:///court_sync.db

# CORS Configuration (comma-separated list)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Optional Variables (with defaults)

```bash
# These have defaults but can be overridden
HOST=127.0.0.1
PORT=5000
SECRET_KEY=a_default_very_secret_key
DEV_DATABASE_URL=sqlite:///court_sync_dev.db
DATABASE_URL=sqlite:///court_sync.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Frontend Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

### Required Variables

```bash
# Backend URL for frontend to connect to
VITE_BACKEND_URL=http://127.0.0.1:5000
VITE_SOCKET_URL=http://127.0.0.1:5000
```

## Production Configuration

For production deployment, consider using these values:

```bash
# Backend (.env in root)
FLASK_CONFIG=production
HOST=0.0.0.0
PORT=8080
SECRET_KEY=your-production-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/courtsync
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend (.env in frontend/)
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
```

## Development Setup

1. **Backend Setup:**
   ```bash
   # In root directory
   cp .env.example .env  # Create .env file
   # Edit .env with your values
   ```

2. **Frontend Setup:**
   ```bash
   # In frontend directory
   cp .env.example .env  # Create .env file
   # Edit .env with your values
   ```

## Security Notes

- **Never commit `.env` files** to version control
- **Change the SECRET_KEY** in production
- **Use strong passwords** for database connections
- **Configure CORS properly** for production domains
- **Use HTTPS** in production for all URLs

## File Structure

```
CourtSync/
├── .env                    # Backend environment variables
├── frontend/
│   └── .env               # Frontend environment variables
├── .env.example           # Backend example (create this)
└── frontend/.env.example  # Frontend example (create this)
```

## Environment Variables Explained

### Backend Variables

- **FLASK_CONFIG**: Determines which configuration class to use
- **HOST**: Server host address (0.0.0.0 for all interfaces)
- **PORT**: Server port number
- **SECRET_KEY**: Flask secret key for sessions and security
- **DEV_DATABASE_URL**: Development database connection string
- **DATABASE_URL**: Production database connection string
- **CORS_ORIGINS**: Allowed origins for CORS (comma-separated)

### Frontend Variables

- **VITE_BACKEND_URL**: Backend API URL for HTTP requests
- **VITE_SOCKET_URL**: Backend URL for WebSocket connections

## Troubleshooting

1. **Port already in use**: Change the PORT variable
2. **CORS errors**: Add your frontend URL to CORS_ORIGINS
3. **Database connection issues**: Check DATABASE_URL format
4. **Frontend can't connect**: Verify VITE_BACKEND_URL is correct
