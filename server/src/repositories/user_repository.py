"""
User repository for database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
import logging

from .base_repository import BaseRepository
from ..database.models import User

logger = logging.getLogger(__name__)

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address"""
        try:
            return db.query(User).filter(User.email == email).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting user by email {email}: {e}")
            raise

    def get_by_role(self, db: Session, role: str, skip: int = 0, limit: int = 100) -> List[User]:
        """Get users by role"""
        try:
            return (
                db.query(User)
                .filter(User.role == role)
                .filter(User.is_active == True)
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting users by role {role}: {e}")
            raise

    def get_active_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users"""
        try:
            return (
                db.query(User)
                .filter(User.is_active == True)
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error("Error getting active users: {e}")
            raise

    def create_user(
        self, 
        db: Session, 
        email: str, 
        name: str = None, 
        role: str = "student"
    ) -> User:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = self.get_by_email(db, email)
            if existing_user:
                raise ValueError(f"User with email {email} already exists")

            return self.create(
                db,
                email=email,
                name=name,
                role=role
            )
        except SQLAlchemyError as e:
            logger.error(f"Error creating user: {e}")
            raise

    def update_last_login(self, db: Session, user_id: UUID) -> Optional[User]:
        """Update user's last login timestamp"""
        try:
            user = self.get_by_id(db, user_id)
            if user:
                from datetime import datetime, timezone
                return self.update(db, user, last_login=datetime.now(timezone.utc))
            return None
        except SQLAlchemyError as e:
            logger.error(f"Error updating last login for user {user_id}: {e}")
            raise

    def deactivate_user(self, db: Session, user_id: UUID) -> bool:
        """Deactivate a user instead of deleting"""
        try:
            user = self.get_by_id(db, user_id)
            if user:
                self.update(db, user, is_active=False)
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating user {user_id}: {e}")
            raise

    def reactivate_user(self, db: Session, user_id: UUID) -> bool:
        """Reactivate a deactivated user"""
        try:
            user = self.get_by_id(db, user_id)
            if user:
                self.update(db, user, is_active=True)
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error reactivating user {user_id}: {e}")
            raise

# Global instance
user_repository = UserRepository()