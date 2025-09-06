"""
Base repository class with common CRUD operations
"""
from typing import Generic, TypeVar, Type, List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T]):
        self.model = model

    def create(self, db: Session, **kwargs) -> T:
        """Create a new record"""
        try:
            db_obj = self.model(**kwargs)
            db.add(db_obj)
            db.flush()  # Flush to get the ID without committing
            db.refresh(db_obj)
            return db_obj
        except SQLAlchemyError as e:
            logger.error(f"Error creating {self.model.__name__}: {e}")
            db.rollback()
            raise

    def get_by_id(self, db: Session, id: UUID) -> Optional[T]:
        """Get a record by ID"""
        try:
            return db.query(self.model).filter(self.model.id == id).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model.__name__} by ID {id}: {e}")
            raise

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all records with pagination"""
        try:
            return db.query(self.model).offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting all {self.model.__name__}: {e}")
            raise

    def update(self, db: Session, db_obj: T, **kwargs) -> T:
        """Update a record"""
        try:
            for field, value in kwargs.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            db.flush()
            db.refresh(db_obj)
            return db_obj
        except SQLAlchemyError as e:
            logger.error(f"Error updating {self.model.__name__}: {e}")
            db.rollback()
            raise

    def delete(self, db: Session, id: UUID) -> bool:
        """Delete a record by ID"""
        try:
            db_obj = self.get_by_id(db, id)
            if db_obj:
                db.delete(db_obj)
                db.flush()
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error deleting {self.model.__name__} with ID {id}: {e}")
            db.rollback()
            raise

    def exists(self, db: Session, **filters) -> bool:
        """Check if a record exists with given filters"""
        try:
            query = db.query(self.model)
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == value)
            return query.first() is not None
        except SQLAlchemyError as e:
            logger.error(f"Error checking existence of {self.model.__name__}: {e}")
            raise

    def count(self, db: Session, **filters) -> int:
        """Count records with optional filters"""
        try:
            query = db.query(self.model)
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == value)
            return query.count()
        except SQLAlchemyError as e:
            logger.error(f"Error counting {self.model.__name__}: {e}")
            raise