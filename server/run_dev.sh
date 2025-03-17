#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  if [ -f "server/.env" ]; then
    export $(grep -v '^#' server/.env | xargs)
    if [ -z "$OPENAI_API_KEY" ]; then
      echo "Warning: OPENAI_API_KEY is not set in server/.env"
      echo "The application may not work correctly without an OpenAI API key."
    else
      echo "Using OPENAI_API_KEY from server/.env"
    fi
  else
    echo "Warning: OPENAI_API_KEY is not set and server/.env does not exist."
    echo "The application may not work correctly without an OpenAI API key."
  fi
fi

# Create uploads directory structure
mkdir -p uploads/courses
echo "Created uploads directory structure"

# Check if PostgreSQL container is running
if ! docker ps | grep -q ai-ta-postgres; then
  echo "Starting PostgreSQL container..."
  docker-compose up -d postgres
  
  # Wait for PostgreSQL to start
  echo "Waiting for PostgreSQL to start..."
  sleep 5
else
  echo "PostgreSQL container is already running"
fi

# Check if Python dependencies are installed
cd server
if ! command -v uvicorn > /dev/null 2>&1; then
  echo "Installing Python dependencies..."
  pip install -r requirements.txt
else
  echo "Python dependencies are already installed"
fi

# Initialize uploads directory
echo "Initializing uploads directory..."
python init_uploads.py

# Run the server in development mode
echo "Starting server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 