"""
SQLAlchemy models for AI Teaching Assistant
"""
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, Date, 
    ForeignKey, UniqueConstraint, ARRAY, JSON, Float, BigInteger, Interval
)
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.sql.sqltypes import TypeDecorator
from .connection import Base
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Custom type for pgvector
class Vector(TypeDecorator):
    impl = Text
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from pgvector.sqlalchemy import Vector as PGVector
            return dialect.type_descriptor(PGVector(3072))
        return dialect.type_descriptor(Text())

# Define ENUM types
UserRoleEnum = ENUM('student', 'instructor', 'admin', name='user_role')
EnrollmentRoleEnum = ENUM('student', 'ta', 'instructor', name='enrollment_role')  
MessageSenderEnum = ENUM('user', 'ai', name='message_sender')
ProcessingStatusEnum = ENUM('pending', 'processing', 'completed', 'failed', name='processing_status')

class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    role = Column(UserRoleEnum, nullable=False, default='student', index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    taught_courses = relationship("Course", back_populates="instructor")
    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")
    uploaded_materials = relationship("CourseMaterial", back_populates="uploader")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    user_analytics = relationship("UserAnalytics", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String(50), unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    semester = Column(String(50))
    year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, index=True)
    meta_data = Column(JSON, default={})
    
    # Relationships
    instructor = relationship("User", back_populates="taught_courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("CourseMaterial", back_populates="course", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="course", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="course", cascade="all, delete-orphan")
    vector_embeddings = relationship("VectorEmbedding", back_populates="course", cascade="all, delete-orphan")
    course_analytics = relationship("CourseAnalytics", back_populates="course", cascade="all, delete-orphan")
    user_analytics = relationship("UserAnalytics", back_populates="course", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Course(id={self.id}, code='{self.course_code}', name='{self.name}')>"

class Enrollment(Base):
    __tablename__ = 'enrollments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    role = Column(EnrollmentRoleEnum, nullable=False, default='student')
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    dropped_at = Column(DateTime(timezone=True))
    grade = Column(String(10))
    
    __table_args__ = (UniqueConstraint('user_id', 'course_id', name='unique_user_course'),)
    
    # Relationships
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    
    @hybrid_property
    def is_active(self):
        return self.dropped_at is None
    
    def __repr__(self):
        return f"<Enrollment(user_id={self.user_id}, course_id={self.course_id}, role='{self.role}')>"

class CourseMaterial(Base):
    __tablename__ = 'course_materials'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50))
    s3_key = Column(String(512), unique=True, nullable=False, index=True)
    file_size = Column(BigInteger)
    mime_type = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_processed = Column(Boolean, default=False)
    processing_status = Column(ProcessingStatusEnum, default='pending')
    meta_data = Column(JSON, default={})
    
    # Relationships
    course = relationship("Course", back_populates="materials")
    uploader = relationship("User", back_populates="uploaded_materials")
    vector_embeddings = relationship("VectorEmbedding", back_populates="material", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CourseMaterial(id={self.id}, file_name='{self.file_name}', status='{self.processing_status}')>"

class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    message_count = Column(Integer, default=0)
    s3_archive_key = Column(String(512))
    is_archived = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    course = relationship("Course", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    @hybrid_property
    def is_active(self):
        return self.ended_at is None
    
    def __repr__(self):
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, course_id={self.course_id})>"

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(MessageSenderEnum, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    tokens_used = Column(Integer)
    retrieval_context = Column(JSON)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    user = relationship("User", back_populates="chat_messages")
    course = relationship("Course", back_populates="chat_messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, sender='{self.sender}', timestamp='{self.timestamp}')>"

class VectorEmbedding(Base):
    __tablename__ = 'vector_embeddings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey('course_materials.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector)
    meta_data = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    material = relationship("CourseMaterial", back_populates="vector_embeddings")
    course = relationship("Course", back_populates="vector_embeddings")
    
    def __repr__(self):
        return f"<VectorEmbedding(id={self.id}, material_id={self.material_id}, chunk_index={self.chunk_index})>"

class UserAnalytics(Base):
    __tablename__ = 'user_analytics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    queries_count = Column(Integer, default=0)
    documents_accessed = Column(ARRAY(Integer), default=[])
    total_tokens_used = Column(Integer, default=0)
    avg_response_time = Column(Float, default=0.0)
    topics_discussed = Column(JSON, default={})
    
    __table_args__ = (UniqueConstraint('user_id', 'course_id', 'date', name='unique_user_course_date'),)
    
    # Relationships
    user = relationship("User", back_populates="user_analytics")
    course = relationship("Course", back_populates="user_analytics")
    
    def __repr__(self):
        return f"<UserAnalytics(user_id={self.user_id}, course_id={self.course_id}, date='{self.date}')>"

class CourseAnalytics(Base):
    __tablename__ = 'course_analytics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    active_users = Column(Integer, default=0)
    total_queries = Column(Integer, default=0)
    popular_topics = Column(JSON, default={})
    avg_session_duration = Column(Interval)
    material_usage = Column(JSON, default={})
    
    __table_args__ = (UniqueConstraint('course_id', 'date', name='unique_course_date'),)
    
    # Relationships
    course = relationship("Course", back_populates="course_analytics")
    
    def __repr__(self):
        return f"<CourseAnalytics(course_id={self.course_id}, date='{self.date}')>"

class Traffic(Base):
    __tablename__ = 'traffic'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    page_name = Column(String(255), nullable=False, index=True)
    page_url = Column(String(2048), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    session_id = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(255))  # Will store hashed/anonymized IP
    user_agent = Column(Text)
    referrer = Column(String(2048))
    location_country = Column(String(100))
    location_city = Column(String(100))
    device_type = Column(String(50))  # mobile, desktop, tablet
    browser = Column(String(100))
    os = Column(String(100))
    screen_resolution = Column(String(50))
    time_on_page = Column(Integer)  # milliseconds
    meta_data = Column(JSON, default={})
    
    # Relationships
    user = relationship("User", backref="traffic_records")
    
    def __repr__(self):
        return f"<Traffic(id={self.id}, page='{self.page_name}', user_id={self.user_id})>"