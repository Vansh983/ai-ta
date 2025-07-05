#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    if [ -z "$OPENAI_API_KEY" ]; then
      echo "Warning: OPENAI_API_KEY is not set in .env"
      echo "The application may not work correctly without an OpenAI API key."
    else
      echo "Using OPENAI_API_KEY from .env"
    fi
  else
    echo "Warning: OPENAI_API_KEY is not set and .env does not exist."
    echo "The application may not work correctly without an OpenAI API key."
  fi
fi

# Create uploads directory structure
mkdir -p uploads/courses
echo "Created uploads directory structure"

# Check if Python dependencies are installed
if ! command -v uvicorn > /dev/null 2>&1; then
  echo "Installing Python dependencies..."
  pip install -r requirements.txt
else
  echo "Python dependencies are already installed"
fi

# Initialize uploads directory
echo "Initializing uploads directory..."
python src/init_uploads.py

# Run the server in development mode
echo "Starting server..."
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 