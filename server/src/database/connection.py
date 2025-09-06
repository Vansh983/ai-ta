"""
Database connection management for AI Teaching Assistant
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Create the base class for all models
Base = declarative_base()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_ta_user:ai_ta_password@localhost:5432/ai_ta")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,  # Set to True for SQL debugging
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_database_session():
    """
    Create a new database session.
    Use this in dependency injection for FastAPI endpoints.
    """
    session = SessionLocal()
    try:
        return session
    except Exception as e:
        session.close()
        raise e

@contextmanager
def get_db_session():
    """
    Context manager for database sessions.
    Automatically handles session cleanup and rollback on errors.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        session.close()

def init_db():
    """
    Initialize the database by creating all tables.
    This should be called once when the application starts.
    """
    try:
        # Import all models here to ensure they are registered with Base
        from .models import (
            User, Course, Enrollment, CourseMaterial, 
            ChatSession, ChatMessage, VectorEmbedding,
            UserAnalytics, CourseAnalytics
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

def close_db():
    """
    Close database connections.
    Call this when shutting down the application.
    """
    engine.dispose()
    logger.info("Database connections closed")