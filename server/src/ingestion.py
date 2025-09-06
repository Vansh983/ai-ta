import openai
from sqlalchemy.orm import Session
from src.utils import chunk_text
from config.config import OPENAI_API_KEY
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from .database.connection import get_db_session
from .repositories.material_repository import material_repository, vector_repository
from .storage.file_operations import course_file_service

openai.api_key = OPENAI_API_KEY
logger = logging.getLogger(__name__)


def get_embedding(text: str, model: str = "text-embedding-3-large") -> List[float]:
    """Generate embedding for a text chunk"""
    response = openai.Embedding.create(input=text, model=model)
    embedding = response["data"][0]["embedding"]
    return embedding


def process_document_content(
    doc_text: str, 
    material_id: UUID, 
    course_id: UUID,
    db: Session
) -> bool:
    """Process document content and store embeddings in PostgreSQL"""
    try:
        # Split the document into chunks
        chunks = chunk_text(doc_text)
        
        if not chunks:
            raise ValueError("Document produced no text chunks")
        
        # Generate embeddings for each chunk
        chunks_with_embeddings = []
        for i, chunk in enumerate(chunks):
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
            except Exception as e:
                logger.warning(f"Failed to generate embedding for chunk {i}: {e}")
                continue
        
        if not chunks_with_embeddings:
            raise ValueError("Could not generate embeddings for any chunks")
        
        # Store embeddings in database
        vector_repository.create_embeddings(
            db, material_id, course_id, chunks_with_embeddings
        )
        
        # Update material processing status
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
    with get_db_session() as db:
        try:
            # Get material info from database
            material = material_repository.get_by_id(db, material_id)
            if not material:
                logger.error(f"Material {material_id} not found")
                return False
            
            if material.is_processed:
                logger.info(f"Material {material_id} already processed")
                return True
            
            # Update status to processing
            material_repository.update_processing_status(
                db, material_id, 'processing'
            )
            db.commit()  # Commit status change
            
            # Download file content from S3
            doc_text = course_file_service.download_and_extract_text(material.s3_key)
            if not doc_text:
                raise ValueError("Could not extract text from the file")
            
            # Process the document
            success = process_document_content(doc_text, material_id, course_id, db)
            db.commit()  # Commit processing results
            
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
    with get_db_session() as db:
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