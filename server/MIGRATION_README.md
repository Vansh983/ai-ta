# AI Teaching Assistant - Firebase to PostgreSQL Migration

## Overview

This document outlines the complete migration from Firebase to a PostgreSQL + S3 (LocalStack) architecture for the AI Teaching Assistant project.

## Architecture Changes

### Before (Firebase)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Admin SDK
- **Vector Search**: In-memory FAISS indexes

### After (PostgreSQL + S3)
- **Database**: PostgreSQL with pgvector extension
- **Storage**: AWS S3 (LocalStack for development)
- **Authentication**: JWT-based (simplified)
- **Vector Search**: PostgreSQL with pgvector native similarity search
- **Caching**: Redis (optional)

## New Database Schema

### Core Tables
1. **users** - User management with roles
2. **courses** - Course information and metadata
3. **enrollments** - User-course relationships
4. **course_materials** - File metadata and processing status
5. **chat_sessions** - Chat session management
6. **chat_messages** - Individual chat messages
7. **vector_embeddings** - Document embeddings with pgvector
8. **user_analytics** - User activity tracking
9. **course_analytics** - Course-level analytics

### Key Features
- Proper foreign key relationships
- ACID compliance with PostgreSQL
- Vector similarity search with pgvector
- Efficient indexing for performance
- Audit trails with timestamps

## Storage Architecture

### S3 Bucket Structure
```
ai-ta-storage/
├── courses/
│   ├── {course_id}/
│   │   ├── materials/
│   │   │   └── {material_id}/{filename}
│   │   └── processed/
│   │       └── {material_id}/chunks.json
├── chat-archives/
│   ├── {year}/{month}/
│   │   └── {session_id}.json
└── temp/
    └── uploads/
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- OpenAI API key

### Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://ai_ta_user:ai_ta_password@postgres:5432/ai_ta
AWS_ENDPOINT_URL=http://localstack:4566  # LocalStack for development
S3_BUCKET_NAME=ai-ta-storage
```

### Running the Application

1. Start all services:
```bash
cd server
docker-compose up --build
```

This will start:
- PostgreSQL database with pgvector
- LocalStack (S3 emulation)
- Redis (optional caching)
- AI TA server application

2. The application will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Database Initialization

The database is automatically initialized with:
- Required extensions (pgvector, uuid-ossp)
- All table schemas
- Indexes for performance
- Sample data (admin, instructor, student users)
- Sample course

## API Changes

### New Endpoints

#### Course Management
- `POST /courses` - Create course
- `GET /courses` - List courses  
- `GET /courses/{course_id}` - Get course details
- `GET /courses/{course_id}/materials` - List course materials
- `GET /courses/{course_id}/analytics` - Course analytics

#### User Management
- `POST /users` - Create user

#### File Management
- `POST /upload` - Upload course materials
- All files stored in S3 with metadata in PostgreSQL

#### Chat & Analytics
- Enhanced chat history with proper session management
- Real-time analytics and usage tracking

### Existing Endpoints (Updated)
All existing endpoints (`/query`, `/chat`, `/chat-history`, `/refresh-course`) have been updated to use PostgreSQL but maintain the same API interface for backward compatibility.

## Key Features

### Improved Data Management
- **Proper Relationships**: Foreign keys ensure data integrity
- **Session Management**: Chat sessions with proper lifecycle
- **File Processing**: Async processing with status tracking
- **Analytics**: Built-in user and course analytics

### Vector Search with pgvector
- Native PostgreSQL vector operations
- Cosine similarity search
- No need for separate FAISS management
- Efficient indexing with IVFFlat

### Scalable Architecture
- Horizontal scaling with PostgreSQL
- S3 for unlimited file storage
- Redis caching layer
- Proper error handling and logging

### Development Benefits
- **Local Development**: Everything runs in Docker
- **Easy Testing**: Reset database easily
- **Better Debugging**: SQL query logging
- **Version Control**: Database migrations with Alembic

## Production Deployment

For production, update environment variables:

```env
# Use real AWS S3
AWS_ENDPOINT_URL=  # Leave empty for production AWS
AWS_ACCESS_KEY_ID=your_real_access_key
AWS_SECRET_ACCESS_KEY=your_real_secret_key
S3_BUCKET_NAME=your-production-bucket

# Production database
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/ai_ta

# Disable reload
ENVIRONMENT=production
```

## Migration Checklist

### Infrastructure ✅
- [x] Docker Compose with PostgreSQL, LocalStack, Redis
- [x] Database schema and initialization scripts
- [x] S3 bucket setup and folder structure

### Data Layer ✅
- [x] SQLAlchemy models for all entities
- [x] Repository pattern for data access
- [x] Vector embeddings with pgvector
- [x] S3 file operations service

### Application Layer ✅
- [x] Updated main.py with new endpoints
- [x] Chat functionality with PostgreSQL
- [x] Document ingestion with pgvector
- [x] Vector similarity search
- [x] File upload with S3 storage

### Configuration ✅
- [x] Updated requirements.txt
- [x] Environment configuration
- [x] Docker configuration updates
- [x] Removed Firebase dependencies

## Testing the Migration

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Create a Course
```bash
curl -X POST "http://localhost:8000/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "course_code": "TEST101",
    "name": "Test Course",
    "description": "A test course for migration",
    "instructor_email": "instructor@ai-ta.com"
  }'
```

### 3. Upload a File
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "courseId={course_id}" \
  -F "userId=anonymous" \
  -F "file=@test.pdf"
```

### 4. Query the Course
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "{course_id}",
    "query": "What is this course about?",
    "userId": "anonymous"
  }'
```

## Benefits of the Migration

1. **Better Data Integrity**: ACID compliance and foreign key constraints
2. **Improved Performance**: Native SQL queries and pgvector similarity search
3. **Cost Effective**: No cloud service fees, runs entirely local
4. **Developer Friendly**: Easy to reset, backup, and test
5. **Scalable**: Can easily move to production PostgreSQL and real S3
6. **Analytics Ready**: Built-in user and course analytics
7. **Better Monitoring**: Comprehensive logging and health checks

## Troubleshooting

### Database Issues
```bash
# Check database connection
docker-compose exec postgres psql -U ai_ta_user -d ai_ta -c "SELECT version();"

# Check tables
docker-compose exec postgres psql -U ai_ta_user -d ai_ta -c "\dt"
```

### S3 Issues
```bash
# Check LocalStack S3
docker-compose exec localstack awslocal s3 ls

# List buckets
docker-compose exec localstack awslocal s3 ls s3://ai-ta-storage --recursive
```

### Application Logs
```bash
# View server logs
docker-compose logs -f server

# View all service logs
docker-compose logs
```

The migration is now complete and the application runs entirely on PostgreSQL + S3 with improved data management, scalability, and development experience!