from openai import OpenAI
from sqlalchemy.orm import Session
from src.utils import chunk_text
from config.config import OPENAI_API_KEY
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging
from datetime import datetime, timezone

from .database.connection import get_database_session
from .repositories.material_repository import material_repository, vector_repository
from .storage.file_operations import course_file_service

logger = logging.getLogger(__name__)

def _get_openai_client():
    """Get OpenAI client instance"""
    return OpenAI(api_key=OPENAI_API_KEY)


def get_embedding(text: str, model: str = "text-embedding-3-large") -> List[float]:
    """Generate embedding for a text chunk"""
    logger.info(f"Generating embedding for text of length {len(text)} with model {model}")
    try:
        client = _get_openai_client()
        response = client.embeddings.create(input=text, model=model)
        embedding = response.data[0].embedding
        logger.info(f"Successfully generated embedding with dimension {len(embedding)}")
        return embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise


def process_document_content(
    doc_text: str, 
    material_id: UUID, 
    course_id: UUID,
    db: Session
) -> bool:
    """Process document content and store embeddings in PostgreSQL"""
    logger.info(f"Processing document content for material {material_id}, course {course_id}")
    logger.info(f"Document text length: {len(doc_text)} characters")
    
    try:
        # Split the document into chunks
        logger.info("Splitting document into chunks...")
        chunks = chunk_text(doc_text)
        logger.info(f"Generated {len(chunks)} chunks")
        
        if not chunks:
            raise ValueError("Document produced no text chunks")
        
        # Generate embeddings for each chunk
        chunks_with_embeddings = []
        logger.info(f"Generating embeddings for {len(chunks)} chunks...")
        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i+1}/{len(chunks)}")
            try:
                embedding = get_embedding(chunk)
                chunks_with_embeddings.append({
                    'text': chunk,
                    'embedding': embedding,
                    'metadata': {
                        'chunk_length': len(chunk),
                        'word_count': len(chunk.split())
                    }
                })
                logger.info(f"Successfully processed chunk {i+1}")
            except Exception as e:
                logger.warning(f"Failed to generate embedding for chunk {i}: {e}")
                continue
        
        if not chunks_with_embeddings:
            raise ValueError("Could not generate embeddings for any chunks")
        
        # Store embeddings in database
        logger.info(f"Storing {len(chunks_with_embeddings)} embeddings in database...")
        vector_repository.create_embeddings(
            db, material_id, course_id, chunks_with_embeddings
        )
        logger.info("Successfully stored embeddings in database")
        
        # Update material processing status
        logger.info("Updating material processing status...")
        material_repository.update_processing_status(
            db, 
            material_id, 
            'completed',
            is_processed=True,
            metadata={
                'total_chunks': len(chunks_with_embeddings),
                'avg_chunk_length': sum(len(c['text']) for c in chunks_with_embeddings) / len(chunks_with_embeddings)
            }
        )
        logger.info("Successfully updated material processing status")
        
        logger.info(f"Successfully processed document with {len(chunks_with_embeddings)} chunks")
        return True
        
    except Exception as e:
        logger.error(f"Error processing document content: {e}")
        # Update material processing status to failed
        try:
            material_repository.update_processing_status(
                db, material_id, 'failed', is_processed=False,
                metadata={'error': str(e)}
            )
        except:
            pass  # Don't fail if we can't update status
        return False


def ingest_course_material(material_id: UUID, course_id: UUID) -> bool:
    """Ingest a course material by downloading from S3 and processing"""
    logger.info(f"Starting ingestion of material {material_id} for course {course_id}")
    
    with get_database_session() as db:
        try:
            # Get material info from database
            logger.info(f"Fetching material {material_id} from database...")
            material = material_repository.get_by_id(db, material_id)
            if not material:
                logger.error(f"Material {material_id} not found")
                return False
            
            logger.info(f"Found material: {material.file_name} (S3 key: {material.s3_key})")
            
            if material.is_processed:
                logger.info(f"Material {material_id} already processed")
                return True
            
            # Update status to processing
            logger.info("Updating material status to processing...")
            material_repository.update_processing_status(
                db, material_id, 'processing'
            )
            db.commit()  # Commit status change
            logger.info("Status updated to processing")
            
            # Download file content from S3
            logger.info(f"Downloading and extracting text from S3 key: {material.s3_key}")
            doc_text = course_file_service.download_and_extract_text(material.s3_key)
            if not doc_text:
                raise ValueError("Could not extract text from the file")
            logger.info(f"Successfully extracted {len(doc_text)} characters of text")
            
            # Process the document
            logger.info("Starting document processing...")
            success = process_document_content(doc_text, material_id, course_id, db)
            db.commit()  # Commit processing results
            logger.info(f"Document processing completed with success: {success}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error ingesting material {material_id}: {e}")
            db.rollback()
            return False


def ingest_document(doc_text: str) -> bool:
    """Legacy function for backward compatibility - now just validates text"""
    try:
        chunks = chunk_text(doc_text)
        if not chunks:
            raise ValueError("Could not generate chunks from the document. It might be empty or unprocessable.")
        return True
    except Exception as e:
        logger.error(f"Error validating document: {e}")
        raise ValueError(f"Document validation failed: {str(e)}")


def process_unprocessed_materials() -> int:
    """Process all unprocessed materials - useful for batch processing"""
    with get_database_session() as db:
        try:
            unprocessed = material_repository.get_unprocessed_materials(db)
            processed_count = 0
            
            for material in unprocessed:
                logger.info(f"Processing material {material.id}: {material.file_name}")
                if ingest_course_material(material.id, material.course_id):
                    processed_count += 1
                else:
                    logger.error(f"Failed to process material {material.id}")
            
            return processed_count
            
        except Exception as e:
            logger.error(f"Error processing unprocessed materials: {e}")
            return 0


def process_course_materials(course_id: UUID, force_reprocess: bool = False) -> Dict[str, Any]:
    """Process all materials for a specific course"""
    with get_database_session() as db:
        try:
            from .repositories.course_repository import course_repository
            
            # Verify course exists
            course = course_repository.get_by_id(db, course_id)
            if not course:
                raise ValueError(f"Course {course_id} not found")
            
            # Get all materials for the course
            materials = material_repository.get_course_materials(db, course_id)
            
            if not materials:
                return {
                    'course_id': str(course_id),
                    'course_name': course.name,
                    'status': 'no_materials',
                    'processed': 0,
                    'failed': 0,
                    'skipped': 0,
                    'total_materials': 0
                }
            
            processed_count = 0
            failed_count = 0
            skipped_count = 0
            
            for material in materials:
                try:
                    # Skip already processed materials unless force reprocessing
                    if material.is_processed and not force_reprocess:
                        logger.info(f"Material {material.file_name} already processed, skipping")
                        skipped_count += 1
                        continue
                    
                    # If force reprocessing, reset the material first
                    if force_reprocess and material.is_processed:
                        # Delete existing embeddings
                        vector_repository.delete_material_embeddings(db, material.id)
                        # Reset processing status
                        material_repository.update_processing_status(
                            db, material.id, 'pending', is_processed=False
                        )
                        db.commit()
                    
                    logger.info(f"Processing material: {material.file_name}")
                    success = ingest_course_material(material.id, course_id)
                    
                    if success:
                        processed_count += 1
                        logger.info(f"Successfully processed: {material.file_name}")
                    else:
                        failed_count += 1
                        logger.error(f"Failed to process: {material.file_name}")
                        
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error processing material {material.file_name}: {e}")
            
            return {
                'course_id': str(course_id),
                'course_name': course.name,
                'status': 'completed',
                'total_materials': len(materials),
                'processed': processed_count,
                'failed': failed_count,
                'skipped': skipped_count
            }
            
        except Exception as e:
            logger.error(f"Error processing course materials for {course_id}: {e}")
            raise


def get_processing_status() -> Dict[str, Any]:
    """Get processing status across all courses"""
    with get_database_session() as db:
        try:
            from .repositories.course_repository import course_repository
            from .retrieval import get_course_embedding_stats
            
            # Get all courses
            courses = course_repository.get_active_courses(db, limit=1000)
            
            # Get unprocessed materials
            unprocessed_materials = material_repository.get_unprocessed_materials(db, limit=1000)
            
            # Gather statistics by course
            course_stats = []
            total_materials = 0
            total_processed = 0
            total_embeddings = 0
            
            for course in courses:
                materials = material_repository.get_course_materials(db, course.id)
                stats = get_course_embedding_stats(course.id, db)
                
                processed_materials = sum(1 for m in materials if m.is_processed)
                
                course_stat = {
                    'course_id': str(course.id),
                    'course_name': course.name,
                    'total_materials': len(materials),
                    'processed_materials': processed_materials,
                    'unprocessed_materials': len(materials) - processed_materials,
                    'embeddings': stats.get('total_embeddings', 0),
                    'processing_ready': stats.get('total_embeddings', 0) > 0
                }
                
                course_stats.append(course_stat)
                total_materials += len(materials)
                total_processed += processed_materials
                total_embeddings += stats.get('total_embeddings', 0)
            
            return {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'summary': {
                    'total_courses': len(courses),
                    'total_materials': total_materials,
                    'processed_materials': total_processed,
                    'unprocessed_materials': len(unprocessed_materials),
                    'total_embeddings': total_embeddings,
                    'courses_ready': sum(1 for c in course_stats if c['processing_ready'])
                },
                'courses': course_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting processing status: {e}")
            raise