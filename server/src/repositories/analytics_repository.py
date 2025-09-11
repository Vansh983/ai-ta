"""
Repository for analytics data access and management
"""
import logging
from datetime import datetime, timezone, date, timedelta
from typing import Dict, List, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, asc
from sqlalchemy.exc import SQLAlchemyError

from ..database.models import (
    CourseAnalytics, UserAnalytics, ChatMessage, ChatSession, Course
)

logger = logging.getLogger(__name__)

class AnalyticsRepository:
    """Repository for analytics operations"""
    
    def get_course_analytics(
        self, 
        db: Session, 
        course_id: UUID, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: Optional[int] = None
    ) -> List[CourseAnalytics]:
        """Get course analytics for a date range"""
        try:
            query = db.query(CourseAnalytics).filter(
                CourseAnalytics.course_id == course_id
            )
            
            if start_date:
                query = query.filter(CourseAnalytics.date >= start_date)
            if end_date:
                query = query.filter(CourseAnalytics.date <= end_date)
                
            query = query.order_by(desc(CourseAnalytics.date))
            
            if limit:
                query = query.limit(limit)
                
            return query.all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting course analytics: {e}")
            raise

    def get_latest_course_analytics(
        self, 
        db: Session, 
        course_id: UUID
    ) -> Optional[CourseAnalytics]:
        """Get the most recent analytics for a course"""
        try:
            return db.query(CourseAnalytics).filter(
                CourseAnalytics.course_id == course_id
            ).order_by(desc(CourseAnalytics.date)).first()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting latest course analytics: {e}")
            raise

    def create_course_analytics(
        self,
        db: Session,
        course_id: UUID,
        date: date,
        active_users: int,
        total_queries: int,
        popular_topics: Dict[str, Any] = None,
        avg_session_duration: Optional[timedelta] = None,
        material_usage: Dict[str, Any] = None
    ) -> CourseAnalytics:
        """Create new course analytics record"""
        try:
            analytics = CourseAnalytics(
                course_id=course_id,
                date=date,
                active_users=active_users,
                total_queries=total_queries,
                popular_topics=popular_topics or {},
                avg_session_duration=avg_session_duration,
                material_usage=material_usage or {}
            )
            
            db.add(analytics)
            db.commit()
            db.refresh(analytics)
            return analytics
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating course analytics: {e}")
            raise

    def update_course_analytics(
        self,
        db: Session,
        course_id: UUID,
        date: date,
        active_users: int,
        total_queries: int,
        popular_topics: Dict[str, Any] = None,
        avg_session_duration: Optional[timedelta] = None,
        material_usage: Dict[str, Any] = None
    ) -> Optional[CourseAnalytics]:
        """Update existing course analytics record"""
        try:
            analytics = db.query(CourseAnalytics).filter(
                and_(
                    CourseAnalytics.course_id == course_id,
                    CourseAnalytics.date == date
                )
            ).first()
            
            if analytics:
                analytics.active_users = active_users
                analytics.total_queries = total_queries
                analytics.popular_topics = popular_topics or {}
                analytics.avg_session_duration = avg_session_duration
                analytics.material_usage = material_usage or {}
                
                db.commit()
                db.refresh(analytics)
                return analytics
            
            return None
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating course analytics: {e}")
            raise

    def upsert_course_analytics(
        self,
        db: Session,
        course_id: UUID,
        date: date,
        active_users: int,
        total_queries: int,
        popular_topics: Dict[str, Any] = None,
        avg_session_duration: Optional[timedelta] = None,
        material_usage: Dict[str, Any] = None
    ) -> CourseAnalytics:
        """Insert or update course analytics record"""
        try:
            # Try to update first
            existing = self.update_course_analytics(
                db, course_id, date, active_users, total_queries,
                popular_topics, avg_session_duration, material_usage
            )
            
            if existing:
                return existing
            
            # Create new if update didn't find existing record
            return self.create_course_analytics(
                db, course_id, date, active_users, total_queries,
                popular_topics, avg_session_duration, material_usage
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Error upserting course analytics: {e}")
            raise

    def get_course_analytics_summary(
        self, 
        db: Session, 
        course_id: UUID, 
        days: int = 30
    ) -> Dict[str, Any]:
        """Get summarized analytics for a course over a period"""
        try:
            cutoff_date = datetime.now(timezone.utc).date() - timedelta(days=days)
            
            analytics_records = self.get_course_analytics(
                db, course_id, start_date=cutoff_date
            )
            
            if not analytics_records:
                return self._empty_summary()
            
            # Aggregate metrics
            total_users = sum(record.active_users for record in analytics_records)
            total_queries = sum(record.total_queries for record in analytics_records)
            avg_users_per_day = total_users / len(analytics_records) if analytics_records else 0
            avg_queries_per_day = total_queries / len(analytics_records) if analytics_records else 0
            
            # Combine popular topics
            all_topics = {}
            for record in analytics_records:
                if record.popular_topics:
                    for topic, count in record.popular_topics.items():
                        all_topics[topic] = all_topics.get(topic, 0) + count
            
            # Calculate average session duration
            durations = [
                record.avg_session_duration.total_seconds() 
                for record in analytics_records 
                if record.avg_session_duration
            ]
            avg_session_seconds = sum(durations) / len(durations) if durations else 0
            
            return {
                'period_days': days,
                'total_active_users': total_users,
                'total_queries': total_queries,
                'avg_users_per_day': round(avg_users_per_day, 1),
                'avg_queries_per_day': round(avg_queries_per_day, 1),
                'avg_session_duration_minutes': round(avg_session_seconds / 60, 2),
                'popular_topics': dict(
                    sorted(all_topics.items(), key=lambda x: x[1], reverse=True)[:10]
                ),
                'records_count': len(analytics_records),
                'latest_date': max(record.date for record in analytics_records).isoformat()
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting course analytics summary: {e}")
            raise

    def get_user_analytics(
        self,
        db: Session,
        user_id: UUID,
        course_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[UserAnalytics]:
        """Get user analytics for a date range"""
        try:
            query = db.query(UserAnalytics).filter(
                UserAnalytics.user_id == user_id
            )
            
            if course_id:
                query = query.filter(UserAnalytics.course_id == course_id)
            if start_date:
                query = query.filter(UserAnalytics.date >= start_date)
            if end_date:
                query = query.filter(UserAnalytics.date <= end_date)
                
            return query.order_by(desc(UserAnalytics.date)).all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting user analytics: {e}")
            raise

    def create_user_analytics(
        self,
        db: Session,
        user_id: UUID,
        course_id: UUID,
        date: date,
        queries_count: int,
        documents_accessed: List[int] = None,
        total_tokens_used: int = 0,
        avg_response_time: float = 0.0,
        topics_discussed: Dict[str, Any] = None
    ) -> UserAnalytics:
        """Create new user analytics record"""
        try:
            analytics = UserAnalytics(
                user_id=user_id,
                course_id=course_id,
                date=date,
                queries_count=queries_count,
                documents_accessed=documents_accessed or [],
                total_tokens_used=total_tokens_used,
                avg_response_time=avg_response_time,
                topics_discussed=topics_discussed or {}
            )
            
            db.add(analytics)
            db.commit()
            db.refresh(analytics)
            return analytics
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating user analytics: {e}")
            raise

    def get_course_activity_trends(
        self,
        db: Session,
        course_id: UUID,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get daily activity trends for a course"""
        try:
            cutoff_date = datetime.now(timezone.utc).date() - timedelta(days=days)
            
            analytics_records = self.get_course_analytics(
                db, course_id, start_date=cutoff_date
            )
            
            # Convert to trend data
            trends = []
            for record in sorted(analytics_records, key=lambda x: x.date):
                trends.append({
                    'date': record.date.isoformat(),
                    'active_users': record.active_users,
                    'total_queries': record.total_queries,
                    'avg_session_minutes': (
                        record.avg_session_duration.total_seconds() / 60
                        if record.avg_session_duration else 0
                    )
                })
            
            return trends
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting course activity trends: {e}")
            raise

    def get_cross_course_comparison(
        self,
        db: Session,
        course_ids: List[UUID],
        days: int = 30
    ) -> Dict[str, Any]:
        """Compare analytics across multiple courses"""
        try:
            cutoff_date = datetime.now(timezone.utc).date() - timedelta(days=days)
            
            comparison = {}
            
            for course_id in course_ids:
                summary = self.get_course_analytics_summary(db, course_id, days)
                
                # Get course name
                course = db.query(Course).filter(Course.id == course_id).first()
                course_name = course.name if course else str(course_id)
                
                comparison[course_name] = {
                    'course_id': str(course_id),
                    'metrics': summary
                }
            
            return comparison
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting cross-course comparison: {e}")
            raise

    def delete_old_analytics(
        self,
        db: Session,
        days_to_keep: int = 365
    ) -> int:
        """Delete old analytics records beyond retention period"""
        try:
            cutoff_date = datetime.now(timezone.utc).date() - timedelta(days=days_to_keep)
            
            # Delete old course analytics
            course_deleted = db.query(CourseAnalytics).filter(
                CourseAnalytics.date < cutoff_date
            ).delete()
            
            # Delete old user analytics
            user_deleted = db.query(UserAnalytics).filter(
                UserAnalytics.date < cutoff_date
            ).delete()
            
            db.commit()
            
            total_deleted = course_deleted + user_deleted
            logger.info(f"Deleted {total_deleted} old analytics records (before {cutoff_date})")
            
            return total_deleted
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting old analytics: {e}")
            raise

    def _empty_summary(self) -> Dict[str, Any]:
        """Return empty analytics summary"""
        return {
            'period_days': 0,
            'total_active_users': 0,
            'total_queries': 0,
            'avg_users_per_day': 0,
            'avg_queries_per_day': 0,
            'avg_session_duration_minutes': 0,
            'popular_topics': {},
            'records_count': 0,
            'latest_date': None
        }

# Create global instance
analytics_repository = AnalyticsRepository()