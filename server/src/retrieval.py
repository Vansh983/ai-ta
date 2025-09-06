import openai
from sqlalchemy.orm import Session
from config.config import OPENAI_API_KEY
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from .database.connection import get_db_session
from .repositories.material_repository import vector_repository

openai.api_key = OPENAI_API_KEY
logger = logging.getLogger(__name__)


def get_embedding(text: str, model: str = "text-embedding-3-large") -> List[float]:
    """Generate embedding for a query text"""
    response = openai.Embedding.create(input=text, model=model)
    embedding = response["data"][0]["embedding"]
    return embedding


def retrieve_from_course(
    query: str, 
    course_id: UUID, 
    k: int = 5,
    db: Session = None
) -> List[Dict[str, Any]]:
    """Retrieve relevant chunks from a course using vector similarity search"""
    # Use provided session or create a new one
    should_close = db is None
    if db is None:
        db = get_db_session()
    
    try:
        # Generate query embedding
        query_embedding = get_embedding(query)
        
        # Perform similarity search using pgvector
        similar_embeddings = vector_repository.similarity_search(
            db, course_id, query_embedding, limit=k
        )
        
        # Format results
        results = []
        for embedding in similar_embeddings:
            results.append({
                'text': embedding.chunk_text,
                'material_id': str(embedding.material_id),
                'chunk_index': embedding.chunk_index,
                'metadata': embedding.metadata or {},
                'material': {
                    'file_name': embedding.material.file_name if embedding.material else None,
                    'file_type': embedding.material.file_type if embedding.material else None
                }
            })
        
        logger.info(f"Retrieved {len(results)} chunks for query in course {course_id}")
        return results
        
    except Exception as e:
        logger.error(f"Error retrieving chunks for course {course_id}: {e}")
        return []
    finally:
        if should_close:
            db.close()


def retrieve_chunks_text(
    query: str, 
    course_id: UUID, 
    k: int = 5,
    db: Session = None
) -> List[str]:
    """Retrieve relevant text chunks from a course (simplified version)"""
    results = retrieve_from_course(query, course_id, k, db)
    return [result['text'] for result in results]


def retrieve_with_context(
    query: str, 
    course_id: UUID, 
    k: int = 5,
    db: Session = None
) -> Dict[str, Any]:
    """Retrieve chunks with additional context information"""
    results = retrieve_from_course(query, course_id, k, db)
    
    # Group by material
    materials_used = {}
    for result in results:
        material_id = result['material_id']
        if material_id not in materials_used:
            materials_used[material_id] = {
                'file_name': result['material']['file_name'],
                'file_type': result['material']['file_type'],
                'chunks': []
            }
        materials_used[material_id]['chunks'].append({
            'text': result['text'],
            'chunk_index': result['chunk_index']
        })
    
    return {
        'chunks': [result['text'] for result in results],
        'materials_used': list(materials_used.values()),
        'total_chunks': len(results),
        'query': query
    }


def get_course_embedding_stats(course_id: UUID, db: Session = None) -> Dict[str, Any]:
    """Get statistics about embeddings for a course"""
    should_close = db is None
    if db is None:
        db = get_db_session()
    
    try:
        stats = vector_repository.get_embedding_statistics(db, course_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting embedding stats for course {course_id}: {e}")
        return {'total_embeddings': 0, 'total_materials': 0}
    finally:
        if should_close:
            db.close()


# Legacy function for backward compatibility with existing FAISS-based code
def retrieve(query: str, index=None, chunks: List[str] = None, k: int = 5) -> List[str]:
    """Legacy function - now just returns the chunks as-is for backward compatibility"""
    if chunks:
        # If chunks are provided directly, return them (truncated to k)
        return chunks[:k]
    else:
        logger.warning("Legacy retrieve function called without chunks")
        return []