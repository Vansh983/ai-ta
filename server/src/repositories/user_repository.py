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

            # Auto-assign instructor role based on email
            final_role = self._determine_role_from_email(email, role)

            return self.create(
                db,
                email=email,
                name=name,
                role=final_role
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

    def _determine_role_from_email(self, email: str, requested_role: str = "student") -> str:
        """
        Determine the appropriate role based on email address.
        This auto-assigns instructor role for known instructor emails.
        """
        # Define instructor email patterns/domains
        instructor_domains = [
            "@university.edu",
            "@college.edu", 
            "@school.edu",
            "@instructor.com"
        ]
        
        # Define specific instructor emails
        instructor_emails = [
            "instructor@example.com",
            "instructor1@example.com",
            "professor@test.com",
            "v@test.com",
            # Add more specific instructor emails here
        ]
        
        email_lower = email.lower()
        
        # Check if email is in the instructor emails list
        if email_lower in instructor_emails:
            logger.info(f"Auto-assigning instructor role to {email} (found in instructor list)")
            return "instructor"
            
        # Check if email domain matches instructor domains
        for domain in instructor_domains:
            if email_lower.endswith(domain.lower()):
                logger.info(f"Auto-assigning instructor role to {email} (domain match: {domain})")
                return "instructor"
        
        # If no instructor pattern matches, use the requested role
        return requested_role

    def update_user_role(self, db: Session, email: str) -> Optional[User]:
        """Update a user's role based on their email address"""
        try:
            user = self.get_by_email(db, email)
            if not user:
                return None
                
            new_role = self._determine_role_from_email(user.email, user.role)
            if new_role != user.role:
                updated_user = self.update(db, user, role=new_role)
                logger.info(f"Updated user {email} role from {user.role} to {new_role}")
                return updated_user
            
            return user
        except SQLAlchemyError as e:
            logger.error(f"Error updating user role for {email}: {e}")
            raise

# Global instance
user_repository = UserRepository()