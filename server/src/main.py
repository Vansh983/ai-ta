from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
import os
from uuid import UUID, uuid4
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

# Local imports
from src.ingestion import ingest_course_material, process_unprocessed_materials
from src.chat import generate_answer, get_conversation_history_from_db
from src.database.connection import get_database_session, init_db
from src.repositories.user_repository import user_repository
from src.repositories.course_repository import course_repository
from src.repositories.material_repository import material_repository, vector_repository
from src.repositories.chat_repository import chat_repository
from src.storage.file_operations import course_file_service
from src.retrieval import retrieve_chunks_text, get_course_embedding_stats

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
    allow_origins=CORS_ORIGINS + ["https://ai-ta.vercel.app"],
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

@app.get("/courses/{course_id}")
async def get_course(course_id: str, db: Session = Depends(get_db)):
    """Get course details"""
    course_uuid = validate_uuid(course_id, "course ID")
    
    course = course_repository.get_by_id(db, course_uuid)
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
        try:
            ingest_course_material(material.id, course_uuid)
        except Exception as e:
            logger.error(f"Failed to process uploaded file: {e}")
            # Don't fail the upload, processing can be retried
        
        return {
            "message": "File uploaded successfully",
            "material_id": str(material.id),
            "filename": file.filename,
            "s3_key": s3_key
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
            return {
                "answer": "I don't have any course materials to reference yet. Please ask your instructor to upload course materials first."
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)