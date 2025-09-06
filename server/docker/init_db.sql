-- Initialize the AI Teaching Assistant database
-- This script runs when the PostgreSQL container starts for the first time

-- Create the database (if not already created by environment variables)
-- CREATE DATABASE ai_ta;

-- Connect to the ai_ta database
\c ai_ta;

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE enrollment_role AS ENUM ('student', 'ta', 'instructor');
CREATE TYPE message_sender AS ENUM ('user', 'ai');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    semester VARCHAR(50),
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create enrollments table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    role enrollment_role NOT NULL DEFAULT 'student',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dropped_at TIMESTAMP WITH TIME ZONE,
    grade VARCHAR(10),
    UNIQUE(user_id, course_id)
);

-- Create course_materials table
CREATE TABLE course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    s3_key VARCHAR(512) UNIQUE NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status processing_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chat_sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    s3_archive_key VARCHAR(512),
    is_archived BOOLEAN DEFAULT FALSE
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender message_sender NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    retrieval_context JSONB
);

-- Create vector_embeddings table
CREATE TABLE vector_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(3072),  -- OpenAI text-embedding-3-large dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_analytics table
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    queries_count INTEGER DEFAULT 0,
    documents_accessed INTEGER[] DEFAULT '{}',
    total_tokens_used INTEGER DEFAULT 0,
    avg_response_time FLOAT DEFAULT 0,
    topics_discussed JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, course_id, date)
);

-- Create course_analytics table
CREATE TABLE course_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    active_users INTEGER DEFAULT 0,
    total_queries INTEGER DEFAULT 0,
    popular_topics JSONB DEFAULT '{}'::jsonb,
    avg_session_duration INTERVAL,
    material_usage JSONB DEFAULT '{}'::jsonb,
    UNIQUE(course_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_course_materials_course ON course_materials(course_id);
CREATE INDEX idx_course_materials_s3_key ON course_materials(s3_key);
CREATE INDEX idx_chat_sessions_user_course ON chat_sessions(user_id, course_id);
CREATE INDEX idx_chat_messages_session_time ON chat_messages(session_id, timestamp);
CREATE INDEX idx_chat_messages_user_course_time ON chat_messages(user_id, course_id, timestamp);
CREATE INDEX idx_vector_embeddings_material ON vector_embeddings(material_id);
CREATE INDEX idx_vector_embeddings_course ON vector_embeddings(course_id);
CREATE INDEX idx_user_analytics_user_course_date ON user_analytics(user_id, course_id, date);
CREATE INDEX idx_course_analytics_course_date ON course_analytics(course_id, date);

-- Create vector similarity index for embeddings (using cosine distance)
CREATE INDEX idx_vector_embeddings_cosine ON vector_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user for testing
INSERT INTO users (email, name, role) VALUES 
    ('admin@ai-ta.com', 'Admin User', 'admin'),
    ('instructor@ai-ta.com', 'Test Instructor', 'instructor'),
    ('student@ai-ta.com', 'Test Student', 'student');

-- Insert sample course for testing
INSERT INTO courses (course_code, name, description, instructor_id) VALUES 
    ('CS101', 'Introduction to Computer Science', 'Basic concepts of programming and computer science', 
     (SELECT id FROM users WHERE email = 'instructor@ai-ta.com'));

COMMIT;