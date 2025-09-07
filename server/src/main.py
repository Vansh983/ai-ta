from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
import os
from uuid import UUID, uuid4
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

# Local imports
from src.ingestion import (
    ingest_course_material, 
    process_unprocessed_materials, 
    process_course_materials,
    get_processing_status
)
from src.chat import generate_answer, get_conversation_history_from_db
from src.database.connection import get_database_session, init_db
from src.repositories.user_repository import user_repository
from src.repositories.course_repository import course_repository
from src.repositories.material_repository import material_repository, vector_repository
from src.repositories.chat_repository import chat_repository
from src.repositories.traffic_repository import traffic_repository
from src.storage.file_operations import course_file_service
from src.retrieval import retrieve_chunks_text, get_course_embedding_stats
from src.auth import get_current_user, get_current_user_optional, require_instructor, require_student_or_instructor
from src.database.models import User

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AI Teaching Assistant", version="2.0.0")

# Configure CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["https://ai-ta.vercel.app", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing AI Teaching Assistant server...")
    try:
        init_db()
        logger.info("Database initialized successfully")
        
        # Process any unprocessed materials on startup
        processed_count = process_unprocessed_materials()
        if processed_count > 0:
            logger.info(f"Processed {processed_count} materials on startup")
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise

# Dependency to get database session
def get_db():
    db = get_database_session()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class QueryRequest(BaseModel):
    courseId: str
    query: str
    userId: Optional[str] = "anonymous"

class RefreshCourseRequest(BaseModel):
    courseId: str
    userId: Optional[str] = "anonymous"

class ChatMessage(BaseModel):
    content: str
    courseId: str
    userId: Optional[str] = "anonymous"
    sender: Optional[str] = "user"

class ChatHistoryRequest(BaseModel):
    courseId: str
    userId: Optional[str] = "anonymous"
    limit: Optional[int] = 10

class CreateCourseRequest(BaseModel):
    course_code: str
    name: str
    description: Optional[str] = None
    instructor_email: Optional[str] = None
    semester: Optional[str] = None
    year: Optional[int] = None

class CreateUserRequest(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = "student"

class TrafficTrackingRequest(BaseModel):
    page_name: str
    page_url: str
    session_id: str
    referrer: Optional[str] = None
    screen_resolution: Optional[str] = None
    time_on_page: Optional[int] = None
    meta_data: Optional[Dict[str, Any]] = None

# Authentication models
class AuthTokenRequest(BaseModel):
    email: str
    token: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

class AuthResponse(BaseModel):
    user: UserResponse
    message: str

# Helper functions
def validate_uuid(uuid_string: str, entity_name: str = "ID") -> UUID:
    """Validate and convert string to UUID"""
    try:
        return UUID(uuid_string)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {entity_name} format")

def get_or_create_user(db: Session, user_id: str) -> Optional[Any]:
    """Get user by ID, handling anonymous users"""
    if user_id == "anonymous":
        return None
    
    try:
        user_uuid = UUID(user_id)
        return user_repository.get_by_id(db, user_uuid)
    except ValueError:
        # Try to find by email if it's not a UUID
        return user_repository.get_by_email(db, user_id)

# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "AI Teaching Assistant API v2.0", 
        "status": "running",
        "database": "postgresql",
        "storage": "s3"
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Test S3 connection
        s3_status = course_file_service.s3.health_check()
        
        return {
            "status": "healthy",
            "database": "connected",
            "storage": "connected" if s3_status else "disconnected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Authentication Endpoints

@app.post("/auth/verify", response_model=AuthResponse)
async def verify_user(request: AuthTokenRequest, db: Session = Depends(get_db)):
    """Verify user authentication by email or token"""
    try:
        user = user_repository.get_by_email(db, request.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        # Update last login
        user_repository.update_last_login(db, user.id)
        
        return AuthResponse(
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                name=user.name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login=user.last_login
            ),
            message="Authentication successful"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication verification failed: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@app.get("/auth/users")
async def list_users(
    skip: int = 0, 
    limit: int = 100,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db)
):
    """List all users (instructor only)"""
    users = user_repository.get_active_users(db, skip=skip, limit=limit)
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )
        for user in users
    ]

# Course Management Endpoints

@app.post("/courses")
async def create_course(request: CreateCourseRequest, db: Session = Depends(get_db)):
    """Create a new course"""
    try:
        # Find instructor if email provided
        instructor_id = None
        if request.instructor_email:
            instructor = user_repository.get_by_email(db, request.instructor_email)
            if instructor:
                instructor_id = instructor.id
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Instructor with email {request.instructor_email} not found"
                )
        
        course = course_repository.create_course(
            db,
            course_code=request.course_code,
            name=request.name,
            description=request.description,
            instructor_id=instructor_id,
            semester=request.semester,
            year=request.year
        )
        db.commit()
        
        return {
            "id": str(course.id),
            "course_code": course.course_code,
            "name": course.name,
            "description": course.description,
            "created_at": course.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail="Failed to create course")

@app.get("/courses")
async def list_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all active courses"""
    try:
        courses = course_repository.get_active_courses(db, skip=skip, limit=limit)
        return {
            "courses": [
                {
                    "id": str(course.id),
                    "course_code": course.course_code,
                    "name": course.name,
                    "description": course.description,
                    "instructor": {
                        "name": course.instructor.name,
                        "email": course.instructor.email
                    } if course.instructor else None,
                    "semester": course.semester,
                    "year": course.year
                }
                for course in courses
            ]
        }
    except Exception as e:
        logger.error(f"Error listing courses: {e}")
        raise HTTPException(status_code=500, detail="Failed to list courses")

@app.get("/instructor/courses")
async def list_instructor_courses(
    current_user: User = Depends(require_instructor), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """List courses for the authenticated instructor"""
    try:
        courses = course_repository.get_by_instructor(db, current_user.id)
        return {
            "courses": [
                {
                    "id": str(course.id),
                    "course_code": course.course_code,
                    "name": course.name,
                    "description": course.description,
                    "instructor": {
                        "name": course.instructor.name,
                        "email": course.instructor.email
                    } if course.instructor else None,
                    "semester": course.semester,
                    "year": course.year,
                    "created_at": course.created_at,
                    "updated_at": course.updated_at
                }
                for course in courses
            ]
        }
    except Exception as e:
        logger.error(f"Error listing instructor courses for {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list instructor courses")

@app.get("/courses/{course_id}")
async def get_course(course_id: str, db: Session = Depends(get_db)):
    """Get course details"""
    course_uuid = validate_uuid(course_id, "course ID")
    
    # Use get_course_with_materials to ensure instructor is loaded
    course = course_repository.get_course_with_materials(db, course_uuid)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get course statistics
    stats = get_course_embedding_stats(course_uuid, db)
    
    return {
        "id": str(course.id),
        "course_code": course.course_code,
        "name": course.name,
        "description": course.description,
        "instructor": {
            "name": course.instructor.name,
            "email": course.instructor.email
        } if course.instructor else None,
        "semester": course.semester,
        "year": course.year,
        "stats": stats
    }

# User Management Endpoints

@app.post("/users")
async def create_user(request: CreateUserRequest, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        user = user_repository.create_user(
            db,
            email=request.email,
            name=request.name,
            role=request.role
        )
        db.commit()
        
        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "created_at": user.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

# File Upload Endpoints

@app.post("/upload")
async def upload_file(
    courseId: str = Form(...),
    userId: str = Form(default="anonymous"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a course material file"""
    try:
        course_uuid = validate_uuid(courseId, "course ID")
        
        # Verify course exists
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get uploader (can be None for anonymous)
        uploader = get_or_create_user(db, userId)
        uploader_id = uploader.id if uploader else None
        
        # Create material record
        material = material_repository.create_material(
            db,
            course_id=course_uuid,
            uploaded_by=uploader_id,
            file_name=file.filename,
            s3_key="",  # Will be set after upload
            file_size=file.size if hasattr(file, 'size') else None,
            file_type=os.path.splitext(file.filename)[1].lower(),
            mime_type=file.content_type
        )
        db.flush()  # Get the material ID
        
        # Upload to S3
        s3_key = course_file_service.upload_course_material(
            course_uuid, material.id, file.file, file.filename, file.content_type
        )
        
        if not s3_key:
            raise HTTPException(status_code=500, detail="Failed to upload file to storage")
        
        # Update material with S3 key
        material_repository.update(db, material, s3_key=s3_key)
        db.commit()
        
        # Process the document asynchronously (in real app, use task queue)
        # Try processing immediately, but don't fail upload if processing fails
        processing_success = False
        processing_error = None
        try:
            processing_success = ingest_course_material(material.id, course_uuid)
            if processing_success:
                logger.info(f"Successfully processed uploaded file: {file.filename}")
            else:
                logger.warning(f"Processing failed for uploaded file: {file.filename}")
        except Exception as e:
            processing_error = str(e)
            logger.error(f"Failed to process uploaded file: {e}")
            # Don't fail the upload, processing can be retried
        
        return {
            "message": "File uploaded successfully",
            "material_id": str(material.id),
            "filename": file.filename,
            "s3_key": s3_key,
            "processing": {
                "immediate_processing": processing_success,
                "processing_error": processing_error,
                "message": "File processed successfully" if processing_success else 
                          "File uploaded but processing failed - will be retried" if processing_error else
                          "File uploaded but processing failed"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

@app.get("/courses/{course_id}/materials")
async def list_course_materials(course_id: str, db: Session = Depends(get_db)):
    """List materials for a course"""
    course_uuid = validate_uuid(course_id, "course ID")
    
    materials = material_repository.get_course_materials(db, course_uuid)
    
    return {
        "materials": [
            {
                "id": str(material.id),
                "file_name": material.file_name,
                "file_type": material.file_type,
                "file_size": material.file_size,
                "uploaded_at": material.uploaded_at.isoformat(),
                "is_processed": material.is_processed,
                "processing_status": material.processing_status,
                "uploader": {
                    "name": material.uploader.name,
                    "email": material.uploader.email
                } if material.uploader else None
            }
            for material in materials
        ]
    }

# Course Content Management

@app.post("/refresh-course")
async def refresh_course(request: RefreshCourseRequest, db: Session = Depends(get_db)):
    """Refresh course embeddings by reprocessing materials"""
    try:
        course_uuid = validate_uuid(request.courseId, "course ID")
        
        # Verify course exists
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get all materials for the course
        materials = material_repository.get_course_materials(db, course_uuid)
        
        if not materials:
            raise HTTPException(status_code=404, detail="No materials found for this course")
        
        # Reset processing status for all materials
        processed_count = 0
        for material in materials:
            # Delete existing embeddings
            vector_repository.delete_material_embeddings(db, material.id)
            
            # Reset processing status
            material_repository.update_processing_status(
                db, material.id, 'pending', is_processed=False
            )
            
            # Reprocess
            if ingest_course_material(material.id, course_uuid):
                processed_count += 1
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Course {request.courseId} content refreshed successfully",
            "total_materials": len(materials),
            "processed_materials": processed_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing course: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Query and Chat Endpoints

@app.post("/query")
async def query_course(request: QueryRequest, db: Session = Depends(get_db)):
    """Query course content using RAG"""
    try:
        course_uuid = validate_uuid(request.courseId, "course ID")
        
        # Verify course exists and has processed materials
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        stats = get_course_embedding_stats(course_uuid, db)
        if stats['total_embeddings'] == 0:
            raise HTTPException(
                status_code=404, 
                detail="No processed materials found for this course"
            )
        
        answer = generate_answer(
            query=request.query,
            userId=request.userId,
            courseId=request.courseId
        )
        
        return {"answer": answer}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail="Failed to process query")

@app.post("/chat")
async def handle_chat(request: ChatMessage, db: Session = Depends(get_db)):
    """Handle chat message and return AI response"""
    try:
        course_uuid = validate_uuid(request.courseId, "course ID")
        
        # Verify course exists and has processed materials
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        stats = get_course_embedding_stats(course_uuid, db)
        if stats['total_embeddings'] == 0:
            # Check if there are unprocessed materials that could be processed
            materials = material_repository.get_course_materials(db, course_uuid)
            if not materials:
                return {
                    "answer": "I don't have any course materials to reference yet. Please ask your instructor to upload course materials first."
                }
            else:
                # Materials exist but not processed - check processing status
                unprocessed_count = sum(1 for m in materials if not m.is_processed)
                if unprocessed_count > 0:
                    return {
                        "answer": f"I found {len(materials)} course materials, but {unprocessed_count} are still being processed. Please try asking your question again in a few moments, or contact your instructor if this persists."
                    }
                else:
                    return {
                        "answer": "I found course materials but there was an issue processing them. Please contact your instructor for assistance."
                    }
        
        answer = generate_answer(
            query=request.content,
            userId=request.userId,
            courseId=request.courseId
        )
        
        return {"answer": answer}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat message")

@app.get("/chat-history")
async def get_chat_history(
    courseId: str, 
    userId: str = "anonymous", 
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get chat history for a user in a course"""
    try:
        course_uuid = validate_uuid(courseId, "course ID")
        
        if userId == "anonymous":
            return {"history": []}
        
        # Get chat history from database
        messages = chat_repository.get_chat_history(
            db, UUID(userId), course_uuid, limit
        )
        
        # Format for response
        history = []
        for message in reversed(messages):  # Reverse to get chronological order
            history.append({
                "id": str(message.id),
                "content": message.content,
                "sender": message.sender,
                "timestamp": message.timestamp.isoformat()
            })
        
        return {"history": history}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

# Analytics Endpoints

@app.get("/courses/{course_id}/analytics")
async def get_course_analytics(course_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Get analytics for a course"""
    course_uuid = validate_uuid(course_id, "course ID")
    
    try:
        activity = chat_repository.get_course_activity(db, course_uuid, days)
        embedding_stats = get_course_embedding_stats(course_uuid, db)
        
        return {
            "course_id": course_id,
            "activity": activity,
            "materials": embedding_stats,
            "period_days": days
        }
    except Exception as e:
        logger.error(f"Error getting course analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")

# Traffic Tracking Endpoints

@app.post("/track", status_code=204)
async def track_page_visit(
    request: TrafficTrackingRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Track page visit - async, non-blocking endpoint"""
    try:
        # Extract headers for tracking
        user_agent = http_request.headers.get("user-agent", "")
        x_forwarded_for = http_request.headers.get("x-forwarded-for", "")
        x_real_ip = http_request.headers.get("x-real-ip", "")
        
        # Get client IP address
        client_ip = x_real_ip or x_forwarded_for or str(http_request.client.host if http_request.client else "unknown")
        
        # Try to extract user ID from authorization header
        user_id = None
        auth_header = http_request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                # Try to parse the token as UUID
                token = auth_header.replace("Bearer ", "")
                user_id = UUID(token)
            except ValueError:
                # Not a valid UUID, leave as None
                pass
        
        # Create traffic record asynchronously
        traffic_record = traffic_repository.create_traffic_record(
            db=db,
            user_id=user_id,
            page_name=request.page_name,
            page_url=request.page_url,
            session_id=request.session_id,
            ip_address=client_ip,
            user_agent=user_agent,
            referrer=request.referrer,
            screen_resolution=request.screen_resolution,
            meta_data=request.meta_data
        )
        
        # Update time on page if provided
        if request.time_on_page is not None and traffic_record:
            traffic_repository.update_time_on_page(
                db, traffic_record.id, request.time_on_page
            )
        
        db.commit()
        
        # Return 204 No Content (success, no body needed)
        return None
        
    except Exception as e:
        logger.error(f"Error tracking page visit: {e}")
        # Don't fail the request - tracking should be silent
        return None

@app.get("/analytics/traffic")
async def get_traffic_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get traffic analytics data"""
    try:
        # Default to last 30 days if no dates provided
        if start_date is None:
            start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        if end_date is None:
            end_date = datetime.now(timezone.utc).isoformat()
        
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get page views by date
        page_views = traffic_repository.get_page_views_by_date(
            db, start_dt, end_dt, page_name
        )
        
        # Get popular pages
        popular_pages = traffic_repository.get_popular_pages(
            db, start_dt, end_dt, limit=10
        )
        
        # Get device statistics
        device_stats = traffic_repository.get_device_stats(
            db, start_dt, end_dt
        )
        
        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "page_views": [
                {
                    "date": item.date.isoformat(),
                    "views": item.views,
                    "unique_sessions": item.unique_sessions
                }
                for item in page_views
            ],
            "popular_pages": [
                {
                    "page_name": item.page_name,
                    "views": item.views,
                    "unique_sessions": item.unique_sessions,
                    "avg_time_on_page": item.avg_time_on_page
                }
                for item in popular_pages
            ],
            "device_stats": [
                {
                    "device_type": item.device_type,
                    "views": item.views,
                    "unique_sessions": item.unique_sessions
                }
                for item in device_stats
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting traffic analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get traffic analytics")

# Administrative Endpoints

@app.post("/admin/process-materials")
async def process_pending_materials():
    """Process all pending materials (admin endpoint)"""
    try:
        processed_count = process_unprocessed_materials()
        return {
            "message": f"Processed {processed_count} materials",
            "processed_count": processed_count
        }
    except Exception as e:
        logger.error(f"Error processing materials: {e}")
        raise HTTPException(status_code=500, detail="Failed to process materials")

@app.get("/admin/diagnostics")
async def run_diagnostics(db: Session = Depends(get_db)):
    """Diagnostic endpoint to test all components"""
    diagnostics = {}
    
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        diagnostics["database"] = {"status": "OK", "message": "Database connection working"}
    except Exception as e:
        diagnostics["database"] = {"status": "ERROR", "message": f"Database error: {e}"}
    
    try:
        # Test S3 connection
        s3_status = course_file_service.s3.health_check()
        diagnostics["s3"] = {"status": "OK" if s3_status else "ERROR", "message": "S3 connection tested"}
    except Exception as e:
        diagnostics["s3"] = {"status": "ERROR", "message": f"S3 error: {e}"}
    
    try:
        # Test OpenAI API
        from openai import OpenAI
        from config.config import OPENAI_API_KEY
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        test_embedding = openai_client.embeddings.create(
            input="test", 
            model="text-embedding-3-large"
        )
        diagnostics["openai"] = {"status": "OK", "message": "OpenAI API working", "dimension": len(test_embedding.data[0].embedding)}
    except Exception as e:
        diagnostics["openai"] = {"status": "ERROR", "message": f"OpenAI API error: {e}"}
    
    try:
        # Test pgvector
        result = db.execute(text("SELECT * FROM pg_available_extensions WHERE name = 'vector'"))
        row = result.fetchone()
        diagnostics["pgvector"] = {"status": "OK" if row else "ERROR", "message": "pgvector extension check"}
    except Exception as e:
        diagnostics["pgvector"] = {"status": "ERROR", "message": f"pgvector error: {e}"}
    
    try:
        # Check for unprocessed materials
        materials = material_repository.get_unprocessed_materials(db, limit=50)
        diagnostics["materials"] = {
            "status": "INFO", 
            "unprocessed_count": len(materials),
            "message": f"Found {len(materials)} unprocessed materials"
        }
    except Exception as e:
        diagnostics["materials"] = {"status": "ERROR", "message": f"Materials query error: {e}"}
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "diagnostics": diagnostics,
        "overall_status": "ERROR" if any(d.get("status") == "ERROR" for d in diagnostics.values()) else "OK"
    }

@app.post("/admin/process-course/{course_id}")
async def process_specific_course(
    course_id: str, 
    force_reprocess: bool = False,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db)
):
    """Process all materials for a specific course (instructor only)"""
    try:
        course_uuid = validate_uuid(course_id, "course ID")
        
        # Verify course exists
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Process the course materials
        result = process_course_materials(course_uuid, force_reprocess=force_reprocess)
        
        return {
            "message": f"Course processing completed for {result['course_name']}",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing course {course_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/process-all-courses")
async def process_all_courses(
    force_reprocess: bool = False,
    current_user: User = Depends(require_instructor)
):
    """Process all course materials (instructor only)"""
    try:
        with get_database_session() as db:
            # Get all active courses
            courses = course_repository.get_active_courses(db, limit=1000)
            
            results = []
            total_processed = 0
            total_failed = 0
            
            for course in courses:
                try:
                    result = process_course_materials(course.id, force_reprocess=force_reprocess)
                    results.append(result)
                    total_processed += result['processed']
                    total_failed += result['failed']
                except Exception as e:
                    logger.error(f"Failed to process course {course.name}: {e}")
                    results.append({
                        'course_id': str(course.id),
                        'course_name': course.name,
                        'status': 'error',
                        'error': str(e)
                    })
            
            return {
                "message": f"Processed {len(courses)} courses",
                "summary": {
                    "total_courses": len(courses),
                    "total_materials_processed": total_processed,
                    "total_failed": total_failed
                },
                "results": results
            }
            
    except Exception as e:
        logger.error(f"Error processing all courses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/processing-status")
async def get_processing_status_endpoint(current_user: User = Depends(require_instructor)):
    """Get processing status for all courses (instructor only)"""
    try:
        status = get_processing_status()
        return status
    except Exception as e:
        logger.error(f"Error getting processing status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Hook into course creation/update to trigger processing
@app.post("/courses/{course_id}/process")
async def trigger_course_processing(
    course_id: str,
    force_reprocess: bool = False,
    current_user: User = Depends(require_student_or_instructor),
    db: Session = Depends(get_db)
):
    """Trigger processing for a course when materials are added/updated"""
    try:
        course_uuid = validate_uuid(course_id, "course ID")
        
        # Verify course exists
        course = course_repository.get_by_id(db, course_uuid)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Process course materials
        result = process_course_materials(course_uuid, force_reprocess=force_reprocess)
        
        return {
            "message": f"Processing triggered for {result['course_name']}",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering course processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)