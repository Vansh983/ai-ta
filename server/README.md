# AI Teaching Assistant

An AI-powered teaching assistant that helps students with course materials.

## File Storage Structure

The application uses a local file storage system organized by courses. Each course has its own directory for storing files.

### Directory Structure

```
uploads/
└── courses/
    ├── 1/
    │   ├── file1.pdf
    │   └── file2.txt
    ├── 2/
    │   ├── file3.pdf
    │   └── file4.txt
    └── 3/
        ├── file5.pdf
        └── file6.txt
```

### Database Structure

The application uses PostgreSQL to store metadata about files, courses, users, and chats.

#### Tables

- **users**: Stores user information
- **courses**: Stores course information
- **files**: Stores file metadata
- **chats**: Stores chat history

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Installation

1. Clone the repository
2. Set up environment variables
   ```
   cp server/.env.example server/.env
   ```
3. Start the application
   ```
   docker-compose up -d
   ```

### Usage

1. Register a user account
2. Create a course
3. Upload files to the course
4. Ask questions about the course materials

## API Endpoints

### Authentication

- `POST /register`: Register a new user
- `POST /token`: Get an access token

### Courses

- `POST /courses`: Create a new course
- `GET /courses`: Get all courses for the current user

### Files

- `POST /upload-file/{courseId}`: Upload a file to a course
- `GET /course-files/{courseId}`: Get all files for a course
- `DELETE /files/{file_id}`: Delete a file
- `DELETE /course-files/{courseId}`: Delete all files for a course

### Chat

- `POST /chat`: Send a chat message
- `GET /chat-history`: Get chat history for a course 