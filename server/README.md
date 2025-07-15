# AI Teaching Assistant Server

This is the server component of the AI Teaching Assistant project. It provides a FastAPI-based backend that handles document ingestion, chat functionality, and course management.

## Project Structure

```
server/
├── src/                    # Source code
│   ├── main.py            # Main FastAPI application
│   ├── chat.py            # Chat functionality
│   ├── ingestion.py       # Document ingestion
│   ├── retrieval.py       # Document retrieval
│   ├── utils.py           # Utility functions
│   └── firebase_utils.py  # Firebase integration
├── config/                # Configuration files
│   └── config.py         # Application configuration
├── scripts/              # Shell scripts
│   └── run_dev.sh       # Development server script
├── docker/              # Docker-related files
│   ├── Dockerfile      # Production Dockerfile
│   ├── Dockerfile.dev  # Development Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── tests/              # Test files
│   └── __init__.py
├── secrets/           # Secret files (not committed to git)
│   ├── .env          # Environment variables
│   └── service_account.json
├── uploads/          # Uploaded files directory
├── requirements.txt  # Python dependencies
└── README.md        # This file
```

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `secrets/.env.example` to `secrets/.env`
   - Add your OpenAI API key and other required variables

4. Run the development server:
   ```bash
   ./scripts/run_dev.sh
   ```

## Docker Development

To run the server using Docker:

```bash
docker-compose -f docker/docker-compose.yml up
```

## API Endpoints

- `POST /query`: Query the course content
- `POST /chat`: Send a chat message
- `GET /chat-history`: Get chat history
- `POST /refresh-course`: Refresh course content

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests (when implemented)
4. Submit a pull request

## License

[Your License Here] 