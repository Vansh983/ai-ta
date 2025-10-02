# AI Teaching Assistant Backend

The `server/` workspace hosts the FastAPI backend that powers the AI Teaching Assistant platform. It exposes REST endpoints for course management, document ingestion, retrieval-augmented chat, and analytics. The service integrates with PostgreSQL (pgvector), Redis, AWS S3 compatible storage, and OpenAI APIs.

## Architectural Overview

- **Application Framework:** FastAPI with Uvicorn
- **Persistence:** PostgreSQL + pgvector for embeddings, SQLAlchemy ORM
- **Object Storage:** AWS S3 (or LocalStack-compatible endpoint for local dev)
- **Caching/Queues:** Redis for short-lived data and background coordination
- **AI Integration:** OpenAI Assistants/Responses for chat and document processing
- **Modules:**
  - `src/main.py` – FastAPI app, routers, dependency wiring
  - `src/ingestion.py` – document ingestion and embedding pipeline
  - `src/retrieval.py` – vector search helpers
  - `src/chat.py` – chat session helpers backed by OpenAI
  - `src/storage/` – S3 client and upload helpers
  - `src/database/` – SQLAlchemy models and session management

## Directory Guide

```
server/
├── config/               # Environment loading & shared settings
├── docker/               # Dockerfiles and compose overrides
├── scripts/              # Helper scripts (e.g., run_dev.sh for local dev)
├── src/                  # Application source code
│   ├── analytics_processor.py
│   ├── auth.py
│   ├── chat.py
│   ├── ingestion.py
│   ├── init_uploads.py
│   ├── main.py
│   ├── repositories/
│   ├── retrieval.py
│   ├── storage/
│   └── utils.py
├── tests/                # Pytest-based tests (expand as features grow)
├── requirements.txt      # Python dependencies
├── docker-compose.yml    # Standalone backend stack (Postgres, Redis, API)
└── README.md             # This file
```

## Environment Configuration

Create a `.env` file in `server/` using the provided template:

```bash
cp .env.example .env
```

Populate the following required values before running the API:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI key with access to the required models |
| `DATABASE_URL` | PostgreSQL connection string (pgvector extension required) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials for your S3 bucket or LocalStack |
| `AWS_DEFAULT_REGION` | AWS region (defaults to `ca-central-1`) |
| `S3_BUCKET_NAME` | Bucket for document and embedding assets |
| `REDIS_URL` | Redis connection string (optional but recommended) |

Never commit real credentials—keep `.env` files excluded via `.gitignore`.

## Local Development

### Option 1: Docker Compose (recommended)

```bash
cd server
docker-compose up --build
```

This brings up PostgreSQL (with pgvector), Redis, and the FastAPI server on http://localhost:8000. Configure environment variables via the `.env` file referenced by the compose file.

### Option 2: Native Python Environment

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
export $(grep -v '^#' .env | xargs)  # or use a dotenv loader
./scripts/run_dev.sh
```

`run_dev.sh` ensures Docker (for Postgres/Redis) is running, initialises the uploads directory, and starts Uvicorn with hot reload.

## Useful Commands

- `uvicorn src.main:app --reload` – run FastAPI manually (requires env vars already exported)
- `pytest` – execute the test suite in `server/tests`
- `alembic upgrade head` – run database migrations (configure Alembic as needed)

## Integration with the Frontend

The backend serves REST endpoints consumed by the Next.js client. Key routes include:

- `POST /courses` – create or update courses
- `POST /upload` – upload course materials for ingestion
- `POST /chat` – chat with the AI assistant using course context
- `GET /health` – lightweight health probe used by Docker compose

Additional endpoints for analytics and auth live alongside these routes in `src/main.py`.

## Deployment Notes

- Use the production Dockerfile in `server/docker/Dockerfile`
- Provide all required environment variables through your hosting provider or orchestration platform
- Ensure the database has the pgvector extension enabled (see `server/docker/init_db.sql`)
- Rotate API keys if any credentials were previously committed before sanitisation

## Contributing Guidelines

- Add new services or repositories under `src/` in dedicated modules; keep business logic close to domain folders (`repositories/`, `storage/`, etc.)
- Include tests in `tests/` when introducing new features or fixing regressions
- Run linting and unit tests before opening PRs; enforce formatting with tools of your choice (e.g., `ruff`, `black`) if added later

