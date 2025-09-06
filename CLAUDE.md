# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Teaching Assistant - A full-stack application for educational content management and AI-powered chat assistance. The system allows instructors to upload course materials and provides students with an intelligent chat interface for course-related questions.

## Architecture

This is a microservices architecture with separate frontend and backend services:

### Frontend (`client/`)
- **Framework**: Next.js 15.1.7 with React 19 and TypeScript
- **Styling**: Tailwind CSS with Radix UI components and shadcn/ui
- **State Management**: React Context (see `src/contexts/`)
- **Authentication**: Firebase Auth integration
- **Charts**: Recharts for data visualization
- **Package Manager**: Yarn v4.9.1

### Backend (`server/`)  
- **Framework**: FastAPI with Python 3.10+
- **AI Integration**: OpenAI API for chat functionality
- **Vector Search**: FAISS for document retrieval
- **Database**: Firebase Firestore
- **File Processing**: PyPDF2 for document ingestion

## Development Commands

### Client (Frontend)
```bash
cd client
yarn install          # Install dependencies
yarn dev              # Start development server (uses Turbopack)
yarn build            # Build for production
yarn start            # Start production server
yarn lint             # Run ESLint
```

### Server (Backend)
```bash
cd server
python -m venv venv    # Create virtual environment
source venv/bin/activate  # Activate venv (Windows: venv\Scripts\activate)
pip install -r requirements.txt  # Install dependencies
./scripts/run_dev.sh   # Start development server with auto-setup
# OR manually:
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Development
```bash
docker-compose up --build    # Start full application stack
# Server only:
cd server && docker-compose -f docker/docker-compose.yml up
```

## Key Architecture Patterns

### Client Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable React components
- `src/contexts/` - React Context providers for global state
- `src/lib/` - Utility functions and shared logic
- Uses Firebase for authentication and data management

### Server Structure  
- `src/main.py` - FastAPI application entry point and route definitions
- `src/chat.py` - Chat functionality and AI integration
- `src/ingestion.py` - Document upload and processing pipeline
- `src/retrieval.py` - Vector search and document retrieval
- `src/firebase_utils.py` - Firebase integration utilities
- `uploads/` - File storage directory for course materials

### Data Flow
1. Documents uploaded through client → processed in `ingestion.py` → stored with FAISS vectors
2. User queries → `chat.py` → retrieval from vector store → OpenAI processing → response
3. Firebase handles user authentication and course metadata storage

## Environment Setup

Both client and server require environment configuration:
- Client: Copy `.env.local.example` to `.env.local` 
- Server: Copy `secrets/.env.example` to `secrets/.env` or `.env`
- Key variables: Firebase config, OpenAI API key, CORS origins

## Port Configuration
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- FastAPI docs: http://localhost:8000/docs

## Testing
Currently no test suite is implemented. Tests should be added in `server/tests/` when implemented.