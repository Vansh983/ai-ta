"""
Material repository for course materials and vector embeddings
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc, and_, func
from uuid import UUID
import logging

from .base_repository import BaseRepository
from ..database.models import CourseMaterial, VectorEmbedding, Course

logger = logging.getLogger(__name__)

class MaterialRepository(BaseRepository[CourseMaterial]):
    def __init__(self):
        super().__init__(CourseMaterial)

    def create_material(
        self,
        db: Session,
        course_id: UUID,
        uploaded_by: UUID,
        file_name: str,
        s3_key: str,
        file_size: int = None,
        file_type: str = None,
        mime_type: str = None,
        metadata: Dict[str, Any] = None
    ) -> CourseMaterial:
        """Create a new course material"""
        try:
            return self.create(
                db,
                course_id=course_id,
                uploaded_by=uploaded_by,
                file_name=file_name,
                s3_key=s3_key,
                file_size=file_size,
                file_type=file_type,
                mime_type=mime_type,
                metadata=metadata or {}
            )
        except SQLAlchemyError as e:
            logger.error(f"Error creating material: {e}")
            raise

    def get_course_materials(
        self, 
        db: Session, 
        course_id: UUID,
        include_processed_only: bool = False
    ) -> List[CourseMaterial]:
        """Get all materials for a course"""
        try:
            query = (
                db.query(CourseMaterial)
                .filter(CourseMaterial.course_id == course_id)
                .options(joinedload(CourseMaterial.uploader))
            )
            
            if include_processed_only:
                query = query.filter(CourseMaterial.is_processed == True)
            
            return query.order_by(desc(CourseMaterial.uploaded_at)).all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting course materials: {e}")
            raise

    def get_by_s3_key(self, db: Session, s3_key: str) -> Optional[CourseMaterial]:
        """Get material by S3 key"""
        try:
            return db.query(CourseMaterial).filter(CourseMaterial.s3_key == s3_key).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting material by S3 key {s3_key}: {e}")
            raise

    def update_processing_status(
        self, 
        db: Session, 
        material_id: UUID, 
        status: str,
        is_processed: bool = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[CourseMaterial]:
        """Update material processing status"""
        try:
            material = self.get_by_id(db, material_id)
            if material:
                update_data = {"processing_status": status}
                
                if is_processed is not None:
                    update_data["is_processed"] = is_processed
                
                if metadata:
                    # Merge with existing metadata
                    existing_metadata = material.metadata or {}
                    existing_metadata.update(metadata)
                    update_data["metadata"] = existing_metadata
                
                return self.update(db, material, **update_data)
            return None
        except SQLAlchemyError as e:
            logger.error(f"Error updating processing status: {e}")
            raise

    def get_unprocessed_materials(self, db: Session, limit: int = 100) -> List[CourseMaterial]:
        """Get materials that haven't been processed yet"""
        try:
            return (
                db.query(CourseMaterial)
                .filter(CourseMaterial.is_processed == False)
                .filter(CourseMaterial.processing_status.in_(['pending', 'failed']))
                .order_by(CourseMaterial.uploaded_at)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error("Error getting unprocessed materials: {e}")
            raise

class VectorRepository(BaseRepository[VectorEmbedding]):
    def __init__(self):
        super().__init__(VectorEmbedding)

    def create_embeddings(
        self,
        db: Session,
        material_id: UUID,
        course_id: UUID,
        chunks_with_embeddings: List[Dict[str, Any]]
    ) -> List[VectorEmbedding]:
        """Create multiple vector embeddings for a material"""
        try:
            embeddings = []
            for i, chunk_data in enumerate(chunks_with_embeddings):
                embedding = VectorEmbedding(
                    material_id=material_id,
                    course_id=course_id,
                    chunk_text=chunk_data['text'],
                    chunk_index=i,
                    embedding=chunk_data['embedding'],
                    metadata=chunk_data.get('metadata', {})
                )
                db.add(embedding)
                embeddings.append(embedding)
            
            db.flush()
            for embedding in embeddings:
                db.refresh(embedding)
            
            return embeddings
        except SQLAlchemyError as e:
            logger.error(f"Error creating embeddings: {e}")
            db.rollback()
            raise

    def get_material_embeddings(
        self, 
        db: Session, 
        material_id: UUID
    ) -> List[VectorEmbedding]:
        """Get all embeddings for a material"""
        try:
            return (
                db.query(VectorEmbedding)
                .filter(VectorEmbedding.material_id == material_id)
                .order_by(VectorEmbedding.chunk_index)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting material embeddings: {e}")
            raise

    def get_course_embeddings(
        self, 
        db: Session, 
        course_id: UUID
    ) -> List[VectorEmbedding]:
        """Get all embeddings for a course"""
        try:
            return (
                db.query(VectorEmbedding)
                .filter(VectorEmbedding.course_id == course_id)
                .options(joinedload(VectorEmbedding.material))
                .order_by(VectorEmbedding.material_id, VectorEmbedding.chunk_index)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting course embeddings: {e}")
            raise

    def similarity_search(
        self,
        db: Session,
        course_id: UUID,
        query_embedding: List[float],
        limit: int = 5
    ) -> List[VectorEmbedding]:
        """Find similar embeddings using cosine similarity"""
        try:
            # Using pgvector's cosine similarity operator
            return (
                db.query(VectorEmbedding)
                .filter(VectorEmbedding.course_id == course_id)
                .order_by(VectorEmbedding.embedding.cosine_distance(query_embedding))
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error performing similarity search: {e}")
            raise

    def delete_material_embeddings(self, db: Session, material_id: UUID) -> int:
        """Delete all embeddings for a material"""
        try:
            count = (
                db.query(VectorEmbedding)
                .filter(VectorEmbedding.material_id == material_id)
                .delete()
            )
            db.flush()
            return count
        except SQLAlchemyError as e:
            logger.error(f"Error deleting material embeddings: {e}")
            raise

    def get_embedding_statistics(self, db: Session, course_id: UUID) -> Dict[str, Any]:
        """Get statistics about embeddings for a course"""
        try:
            total_embeddings = (
                db.query(func.count(VectorEmbedding.id))
                .filter(VectorEmbedding.course_id == course_id)
                .scalar()
            )
            
            total_materials = (
                db.query(func.count(func.distinct(VectorEmbedding.material_id)))
                .filter(VectorEmbedding.course_id == course_id)
                .scalar()
            )
            
            return {
                'total_embeddings': total_embeddings or 0,
                'total_materials': total_materials or 0
            }
        except SQLAlchemyError as e:
            logger.error(f"Error getting embedding statistics: {e}")
            raise

# Global instances
material_repository = MaterialRepository()
vector_repository = VectorRepository()