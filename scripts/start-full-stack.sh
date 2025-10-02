#!/bin/bash

# AI Teaching Assistant - Full Stack Startup Script
# This script starts the entire application with frontend, backend, and database

set -e

echo "🚀 Starting AI Teaching Assistant Full Stack..."
echo ""

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists with OpenAI key
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  WARNING: Please set your OpenAI API key in .env file"
    echo "   Edit .env and replace 'your_openai_api_key_here' with your actual key"
    echo "   You can continue without it, but chat functionality won't work."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Clean up any existing containers (optional)
echo "🧹 Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start all services
echo "🔨 Building and starting all services..."
echo "   - PostgreSQL database with pgvector"
echo "   - LocalStack (AWS S3 emulation)"
echo "   - Redis (caching)"
echo "   - Backend API server"
echo "   - Frontend Next.js client"
echo ""

docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL to be ready
echo "   Waiting for PostgreSQL..."
max_attempts=30
attempt=1
until docker-compose exec -T postgres pg_isready -U ai_ta_user -d ai_ta &>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ PostgreSQL failed to start after $max_attempts attempts"
        docker-compose logs postgres
        exit 1
    fi
    echo "   PostgreSQL not ready yet (attempt $attempt/$max_attempts)..."
    sleep 2
    ((attempt++))
done

echo "   ✅ PostgreSQL is ready!"

# Wait for LocalStack to be ready
echo "   Waiting for LocalStack (S3)..."
max_attempts=30
attempt=1
until curl -s http://localhost:4566/_localstack/health | grep -q '"s3": "available"' &>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ LocalStack failed to start after $max_attempts attempts"
        docker-compose logs localstack
        exit 1
    fi
    echo "   LocalStack not ready yet (attempt $attempt/$max_attempts)..."
    sleep 2
    ((attempt++))
done

echo "   ✅ LocalStack (S3) is ready!"

# Wait for backend server to be ready
echo "   Waiting for backend server..."
max_attempts=30
attempt=1
until curl -s http://localhost:8000/health &>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Backend server failed to start after $max_attempts attempts"
        docker-compose logs server
        exit 1
    fi
    echo "   Backend server not ready yet (attempt $attempt/$max_attempts)..."
    sleep 3
    ((attempt++))
done

echo "   ✅ Backend server is ready!"

# Wait for frontend to be ready
echo "   Waiting for frontend..."
max_attempts=30
attempt=1
until curl -s http://localhost:3000 &>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Frontend failed to start after $max_attempts attempts"
        docker-compose logs client
        exit 1
    fi
    echo "   Frontend not ready yet (attempt $attempt/$max_attempts)..."
    sleep 3
    ((attempt++))
done

echo "   ✅ Frontend is ready!"

echo ""
echo "🎉 AI Teaching Assistant is now running!"
echo ""
echo "📋 Service URLs:"
echo "   🌐 Frontend:        http://localhost:3000"
echo "   🔧 Backend API:     http://localhost:8000"
echo "   📖 API Docs:       http://localhost:8000/docs"
echo "   💾 PostgreSQL:     localhost:5432"
echo "   🪣 LocalStack S3:   http://localhost:4566"
echo "   🗄️  Redis:          localhost:6379"
echo ""
echo "🔍 Health Check:"
echo "   Backend Health:    http://localhost:8000/health"
echo ""
echo "🎯 Sample API Endpoints to Test:"
echo "   GET  /courses           - List all courses"
echo "   POST /courses           - Create a new course"
echo "   POST /upload            - Upload course materials"
echo "   POST /chat              - Chat with AI assistant"
echo "   POST /query             - Query course content"
echo ""
echo "📱 Sample Course Creation:"
echo "   curl -X POST 'http://localhost:8000/courses' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"course_code\":\"TEST101\",\"name\":\"Test Course\",\"description\":\"Test\"}'"
echo ""
echo "📊 Monitor Services:"
echo "   docker-compose logs -f              # All services"
echo "   docker-compose logs -f server       # Backend only"
echo "   docker-compose logs -f client       # Frontend only"
echo "   docker-compose logs -f postgres     # Database only"
echo ""
echo "🛑 Stop Services:"
echo "   docker-compose down                 # Stop all"
echo "   docker-compose down -v             # Stop all + remove volumes"
echo ""
echo "✅ Setup complete! The AI Teaching Assistant is ready to use."