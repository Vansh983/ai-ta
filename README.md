# AI Teaching Assistant

Check it out here: [Landing Page](https://acadri.com)

[![Watch the video](test)](https://www.loom.com/share/09c47d2b73724d50bdaafc21613a6170?sid=27802f61-86ae-43d9-a4b7-72f2ab05368f)
[![Watch the video](https://github.com/user-attachments/assets/9f7671a2-be4c-4fae-bae6-f60039c55c17)](https://www.loom.com/share/09c47d2b73724d50bdaafc21613a6170?sid=27802f61-86ae-43d9-a4b7-72f2ab05368f)

Trying to build a good solution for fixing some educational problems in early university courses.

Being developed by Vansh Sood

## Project Structure

```
.
├── client/             # Next.js frontend application
├── server/             # Python FastAPI backend application
└── docker-compose.yml  # Main Docker compose configuration
```

## Technologies Used

### Frontend (client/)
- Next.js with TypeScript
- Tailwind CSS for styling
- Modern React patterns and hooks
- Environment variables for configuration

### Backend (server/)
- Python FastAPI
- Firebase integration
- File upload and processing capabilities
- Environment-based configuration

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.10+ (for local backend development)
- Firebase account and credentials

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Vansh983/ai-ta.git
cd ai-ta
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in the server directory
   - Copy `.env.local.example` to `.env.local` in the client directory
   - Fill in the required environment variables

3. Start the application using Docker:
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Development Setup

### Frontend Development
```bash
cd client
yarn install
yarn dev
```

### Backend Development
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
./run_dev.sh
```

## API Documentation

Still working on this

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.
