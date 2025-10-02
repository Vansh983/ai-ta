#!/bin/bash

# Script to rebuild just the server service using Docker

set -e

echo "🔄 Rebuilding server service..."

# Stop the server container if running
docker-compose stop server

# Remove the server container
docker-compose rm -f server

# Rebuild and start the server service
docker-compose build server
docker-compose up -d server

echo "✅ Server service rebuilt and started successfully!"
echo "📝 Server is running at http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"

# Show logs for verification
echo "📋 Server logs (last 20 lines):"
docker-compose logs --tail=20 server