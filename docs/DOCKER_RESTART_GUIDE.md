# Docker Restart Guide

This guide covers how to restart the AI Teaching Assistant application after making code changes, specifically after removing Firebase dependencies.

## Quick Restart Commands

### Full Restart with Rebuild
```bash
# Stop all running containers
docker-compose down

# Rebuild and start all services (use when code changes)
docker-compose up --build -d
```

### Using the Convenience Script
```bash
# Alternative: Use the provided startup script
./start-full-stack.sh
```

## Service Architecture

The application runs the following services:

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 3000 | Next.js client application |
| **Backend API** | 8000 | FastAPI server with token-based auth |
| **PostgreSQL** | 5432 | Database with pgvector extension |
| **LocalStack S3** | 4566 | AWS S3 emulation for file storage |
| **Redis** | 6379 | Caching layer |

## Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Monitoring and Debugging

### View Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f client      # Frontend only
docker-compose logs -f server      # Backend only
docker-compose logs -f postgres    # Database only
docker-compose logs -f localstack  # S3 emulation
docker-compose logs -f redis       # Cache
```

### Container Management
```bash
# Check running containers
docker-compose ps

# Stop specific service
docker-compose stop client

# Restart specific service
docker-compose restart server

# Remove containers and volumes (full cleanup)
docker-compose down -v
```

## Build Information

### Frontend Build Output
- **Framework**: Next.js 15.1.7
- **Build Time**: ~26 seconds
- **Bundle Size**: ~231 kB (largest route)
- **Features**: Static optimization, TypeScript validation, ESLint

### Backend Build Output
- **Framework**: FastAPI with Python 3.11
- **Authentication**: Token-based (no Firebase)
- **Database**: PostgreSQL with pgvector for AI features
- **File Storage**: LocalStack S3 emulation

## Recent Changes Applied

✅ **Firebase Removal Complete**
- Removed all Firebase authentication
- Implemented token-based auth system
- Updated all API calls to use PostgreSQL backend
- Fixed TypeScript interface conflicts
- Successful build with no errors

## Troubleshooting

### If containers fail to start:
1. Check logs: `docker-compose logs [service-name]`
2. Verify environment variables are set
3. Ensure ports 3000, 8000, 5432, 4566, 6379 are available
4. Try full cleanup: `docker-compose down -v` then rebuild

### If build fails:
1. Clear Docker cache: `docker system prune -a`
2. Rebuild from scratch: `docker-compose build --no-cache`
3. Check for syntax errors in recent code changes

### Environment Setup
- Client: Copy `.env.local.example` to `.env.local`
- Server: Copy `secrets/.env.example` to `secrets/.env` or `.env`
- Required: OpenAI API key, CORS origins configuration

## Development Workflow

1. Make code changes
2. Run `docker-compose down` to stop services
3. Run `docker-compose up --build -d` to rebuild and restart
4. Monitor logs with `docker-compose logs -f`
5. Access application at http://localhost:3000

---

*Last updated: After Firebase removal and token-based authentication implementation*