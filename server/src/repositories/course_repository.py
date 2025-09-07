"""
Course repository for database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
import logging

from .base_repository import BaseRepository
from ..database.models import Course, User, Enrollment

logger = logging.getLogger(__name__)

class CourseRepository(BaseRepository[Course]):
    def __init__(self):
        super().__init__(Course)

    def get_by_code(self, db: Session, course_code: str) -> Optional[Course]:
        """Get course by course code"""
        try:
            return db.query(Course).filter(Course.course_code == course_code).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting course by code {course_code}: {e}")
            raise

    def get_active_courses(self, db: Session, skip: int = 0, limit: int = 100) -> List[Course]:
        """Get all active courses"""
        try:
            return (
                db.query(Course)
                .filter(Course.is_active == True)
                .options(joinedload(Course.instructor))
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error("Error getting active courses: {e}")
            raise

    def get_by_instructor(self, db: Session, instructor_id: UUID) -> List[Course]:
        """Get courses by instructor"""
        try:
            return (
                db.query(Course)
                .filter(Course.instructor_id == instructor_id)
                .filter(Course.is_active == True)
                .options(joinedload(Course.instructor))
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting courses by instructor {instructor_id}: {e}")
            raise

    def get_user_courses(self, db: Session, user_id: UUID) -> List[Course]:
        """Get courses that a user is enrolled in"""
        try:
            return (
                db.query(Course)
                .join(Enrollment)
                .filter(Enrollment.user_id == user_id)
                .filter(Enrollment.dropped_at.is_(None))
                .filter(Course.is_active == True)
                .options(joinedload(Course.instructor))
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting courses for user {user_id}: {e}")
            raise

    def create_course(
        self, 
        db: Session, 
        course_code: str,
        name: str,
        description: str = None,
        instructor_id: UUID = None,
        semester: str = None,
        year: int = None,
        **kwargs
    ) -> Course:
        """Create a new course"""
        try:
            # Allow duplicate course codes - removed uniqueness check
            return self.create(
                db,
                course_code=course_code,
                name=name,
                description=description,
                instructor_id=instructor_id,
                semester=semester,
                year=year,
                **kwargs
            )
        except SQLAlchemyError as e:
            logger.error(f"Error creating course: {e}")
            raise

    def get_course_with_materials(self, db: Session, course_id: UUID) -> Optional[Course]:
        """Get course with all its materials loaded"""
        try:
            return (
                db.query(Course)
                .filter(Course.id == course_id)
                .options(
                    joinedload(Course.materials),
                    joinedload(Course.instructor)
                )
                .first()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting course with materials {course_id}: {e}")
            raise

    def get_course_with_enrollments(self, db: Session, course_id: UUID) -> Optional[Course]:
        """Get course with all enrollments"""
        try:
            return (
                db.query(Course)
                .filter(Course.id == course_id)
                .options(
                    joinedload(Course.enrollments).joinedload(Enrollment.user),
                    joinedload(Course.instructor)
                )
                .first()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting course with enrollments {course_id}: {e}")
            raise

    def search_courses(self, db: Session, search_term: str, skip: int = 0, limit: int = 100) -> List[Course]:
        """Search courses by name or course code"""
        try:
            search_pattern = f"%{search_term}%"
            return (
                db.query(Course)
                .filter(
                    (Course.name.ilike(search_pattern)) |
                    (Course.course_code.ilike(search_pattern)) |
                    (Course.description.ilike(search_pattern))
                )
                .filter(Course.is_active == True)
                .options(joinedload(Course.instructor))
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error searching courses with term {search_term}: {e}")
            raise

    def deactivate_course(self, db: Session, course_id: UUID) -> bool:
        """Deactivate a course instead of deleting"""
        try:
            course = self.get_by_id(db, course_id)
            if course:
                self.update(db, course, is_active=False)
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating course {course_id}: {e}")
            raise

    def get_courses_by_semester_year(
        self, 
        db: Session, 
        semester: str, 
        year: int,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Course]:
        """Get courses by semester and year"""
        try:
            return (
                db.query(Course)
                .filter(Course.semester == semester)
                .filter(Course.year == year)
                .filter(Course.is_active == True)
                .options(joinedload(Course.instructor))
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting courses for {semester} {year}: {e}")
            raise

# Global instance
course_repository = CourseRepository()