#!/bin/bash

# Script to rebuild just the client service using Docker

set -e

echo "🔄 Rebuilding client service..."

# Stop the client container if running
docker-compose stop client

# Remove the client container
docker-compose rm -f client

# Rebuild and start the client service
docker-compose build client
docker-compose up -d client

echo "✅ Client service rebuilt and started successfully!"
echo "📝 Client is running at http://localhost:3000"

# Show logs for verification
echo "📋 Client logs (last 20 lines):"
docker-compose logs --tail=20 client