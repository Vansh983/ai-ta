"""
Traffic repository for handling traffic tracking data operations
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, and_, desc
from uuid import UUID
from datetime import datetime, timedelta
import logging

from .base_repository import BaseRepository
from ..database.models import Traffic
from ..utils import hash_ip_address, parse_user_agent

logger = logging.getLogger(__name__)

class TrafficRepository(BaseRepository[Traffic]):
    def __init__(self):
        super().__init__(Traffic)
    
    def create_traffic_record(
        self, 
        db: Session, 
        user_id: Optional[UUID],
        page_name: str,
        page_url: str,
        session_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        screen_resolution: Optional[str] = None,
        meta_data: Optional[Dict[str, Any]] = None
    ) -> Traffic:
        """Create a new traffic record with processed data"""
        try:
            # Hash IP address for privacy
            hashed_ip = hash_ip_address(ip_address) if ip_address else None
            
            # Parse user agent for device info
            device_info = parse_user_agent(user_agent) if user_agent else {}
            
            traffic_record = self.create(
                db,
                user_id=user_id,
                page_name=page_name,
                page_url=page_url,
                session_id=session_id,
                ip_address=hashed_ip,
                user_agent=user_agent,
                referrer=referrer,
                device_type=device_info.get('device_type'),
                browser=device_info.get('browser'),
                os=device_info.get('os'),
                screen_resolution=screen_resolution,
                meta_data=meta_data or {}
            )
            
            return traffic_record
            
        except SQLAlchemyError as e:
            logger.error(f"Error creating traffic record: {e}")
            raise
    
    def get_page_views_by_date(
        self, 
        db: Session, 
        start_date: datetime, 
        end_date: datetime,
        page_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get page view counts grouped by date"""
        try:
            query = db.query(
                func.date(Traffic.timestamp).label('date'),
                func.count(Traffic.id).label('views'),
                func.count(func.distinct(Traffic.session_id)).label('unique_sessions')
            ).filter(
                and_(
                    Traffic.timestamp >= start_date,
                    Traffic.timestamp <= end_date
                )
            )
            
            if page_name:
                query = query.filter(Traffic.page_name == page_name)
            
            return query.group_by(func.date(Traffic.timestamp)).order_by('date').all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting page views by date: {e}")
            raise
    
    def get_popular_pages(
        self, 
        db: Session, 
        start_date: datetime, 
        end_date: datetime,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get most popular pages in a date range"""
        try:
            return db.query(
                Traffic.page_name,
                func.count(Traffic.id).label('views'),
                func.count(func.distinct(Traffic.session_id)).label('unique_sessions'),
                func.avg(Traffic.time_on_page).label('avg_time_on_page')
            ).filter(
                and_(
                    Traffic.timestamp >= start_date,
                    Traffic.timestamp <= end_date
                )
            ).group_by(Traffic.page_name).order_by(desc('views')).limit(limit).all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting popular pages: {e}")
            raise
    
    def get_user_activity(
        self, 
        db: Session, 
        user_id: UUID, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Traffic]:
        """Get user's activity in a date range"""
        try:
            return db.query(Traffic).filter(
                and_(
                    Traffic.user_id == user_id,
                    Traffic.timestamp >= start_date,
                    Traffic.timestamp <= end_date
                )
            ).order_by(desc(Traffic.timestamp)).all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting user activity: {e}")
            raise
    
    def get_session_activity(
        self, 
        db: Session, 
        session_id: str
    ) -> List[Traffic]:
        """Get all activity for a specific session"""
        try:
            return db.query(Traffic).filter(
                Traffic.session_id == session_id
            ).order_by(Traffic.timestamp).all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting session activity: {e}")
            raise
    
    def get_device_stats(
        self, 
        db: Session, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get device type statistics"""
        try:
            return db.query(
                Traffic.device_type,
                func.count(Traffic.id).label('views'),
                func.count(func.distinct(Traffic.session_id)).label('unique_sessions')
            ).filter(
                and_(
                    Traffic.timestamp >= start_date,
                    Traffic.timestamp <= end_date,
                    Traffic.device_type.isnot(None)
                )
            ).group_by(Traffic.device_type).all()
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting device stats: {e}")
            raise
    
    def update_time_on_page(
        self, 
        db: Session, 
        traffic_id: UUID, 
        time_on_page: int
    ) -> Optional[Traffic]:
        """Update time spent on page for a traffic record"""
        try:
            traffic_record = self.get_by_id(db, traffic_id)
            if traffic_record:
                return self.update(db, traffic_record, time_on_page=time_on_page)
            return None
            
        except SQLAlchemyError as e:
            logger.error(f"Error updating time on page: {e}")
            raise
    
    def cleanup_old_records(self, db: Session, days: int = 365) -> int:
        """Clean up old traffic records (for data retention)"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            deleted = db.query(Traffic).filter(
                Traffic.timestamp < cutoff_date
            ).delete()
            
            logger.info(f"Cleaned up {deleted} old traffic records")
            return deleted
            
        except SQLAlchemyError as e:
            logger.error(f"Error cleaning up old records: {e}")
            raise

# Create a singleton instance
traffic_repository = TrafficRepository()