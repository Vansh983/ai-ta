"""
Chat repository for database operations
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc, func, and_
from uuid import UUID
from datetime import datetime, timezone, timedelta
import logging

from .base_repository import BaseRepository
from ..database.models import ChatSession, ChatMessage, User, Course

logger = logging.getLogger(__name__)

class ChatRepository(BaseRepository[ChatMessage]):
    def __init__(self):
        super().__init__(ChatMessage)

    def create_session(self, db: Session, user_id: UUID, course_id: UUID) -> ChatSession:
        """Create a new chat session"""
        try:
            session = ChatSession(
                user_id=user_id,
                course_id=course_id,
                started_at=datetime.now(timezone.utc)
            )
            db.add(session)
            db.flush()
            db.refresh(session)
            return session
        except SQLAlchemyError as e:
            logger.error(f"Error creating chat session: {e}")
            db.rollback()
            raise

    def get_or_create_active_session(self, db: Session, user_id: UUID, course_id: UUID) -> ChatSession:
        """Get active session or create new one if none exists"""
        try:
            # Look for an active session (not ended) within the last hour
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=1)
            
            active_session = (
                db.query(ChatSession)
                .filter(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.course_id == course_id,
                        ChatSession.ended_at.is_(None),
                        ChatSession.started_at >= cutoff_time
                    )
                )
                .first()
            )
            
            if active_session:
                return active_session
            else:
                # End any old active sessions and create a new one
                self.end_user_sessions(db, user_id, course_id)
                return self.create_session(db, user_id, course_id)
        except SQLAlchemyError as e:
            logger.error(f"Error getting or creating active session: {e}")
            raise

    def end_session(self, db: Session, session_id: UUID) -> bool:
        """End a chat session"""
        try:
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if session and session.ended_at is None:
                session.ended_at = datetime.now(timezone.utc)
                db.flush()
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error ending session {session_id}: {e}")
            raise

    def end_user_sessions(self, db: Session, user_id: UUID, course_id: UUID) -> int:
        """End all active sessions for a user in a course"""
        try:
            count = (
                db.query(ChatSession)
                .filter(
                    and_(
                        ChatSession.user_id == user_id,
                        ChatSession.course_id == course_id,
                        ChatSession.ended_at.is_(None)
                    )
                )
                .update({"ended_at": datetime.now(timezone.utc)})
            )
            db.flush()
            return count
        except SQLAlchemyError as e:
            logger.error(f"Error ending user sessions: {e}")
            raise

    def add_message(
        self, 
        db: Session, 
        session_id: UUID,
        user_id: UUID,
        course_id: UUID,
        content: str,
        sender: str,
        tokens_used: int = None,
        retrieval_context: Dict[str, Any] = None
    ) -> ChatMessage:
        """Add a message to a chat session"""
        try:
            message = ChatMessage(
                session_id=session_id,
                user_id=user_id,
                course_id=course_id,
                content=content,
                sender=sender,
                timestamp=datetime.now(timezone.utc),
                tokens_used=tokens_used,
                retrieval_context=retrieval_context
            )
            db.add(message)
            db.flush()
            
            # Update session message count
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if session:
                session.message_count = (session.message_count or 0) + 1
                db.flush()
            
            db.refresh(message)
            return message
        except SQLAlchemyError as e:
            logger.error(f"Error adding message: {e}")
            db.rollback()
            raise

    def get_chat_history(
        self, 
        db: Session, 
        user_id: UUID, 
        course_id: UUID, 
        limit: int = 20
    ) -> List[ChatMessage]:
        """Get recent chat history for a user in a course"""
        try:
            return (
                db.query(ChatMessage)
                .filter(
                    and_(
                        ChatMessage.user_id == user_id,
                        ChatMessage.course_id == course_id
                    )
                )
                .order_by(desc(ChatMessage.timestamp))
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting chat history: {e}")
            raise

    def get_conversation_pairs(
        self, 
        db: Session, 
        user_id: UUID, 
        course_id: UUID, 
        limit: int = 3
    ) -> List[Dict[str, str]]:
        """Get recent conversation pairs (user-ai message pairs)"""
        try:
            # Get recent messages
            messages = (
                db.query(ChatMessage)
                .filter(
                    and_(
                        ChatMessage.user_id == user_id,
                        ChatMessage.course_id == course_id
                    )
                )
                .order_by(ChatMessage.timestamp)
                .limit(limit * 2)  # Get more to form pairs
                .all()
            )
            
            # Group into pairs
            pairs = []
            i = 0
            while i < len(messages) - 1:
                if (messages[i].sender == 'user' and 
                    messages[i + 1].sender == 'ai'):
                    pairs.append({
                        'user': messages[i].content,
                        'assistant': messages[i + 1].content
                    })
                    i += 2
                else:
                    i += 1
            
            return pairs[-limit:]  # Return last N pairs
        except SQLAlchemyError as e:
            logger.error(f"Error getting conversation pairs: {e}")
            raise

    def get_session_messages(self, db: Session, session_id: UUID) -> List[ChatMessage]:
        """Get all messages for a specific session"""
        try:
            return (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.timestamp)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting session messages: {e}")
            raise

    def get_user_sessions(
        self, 
        db: Session, 
        user_id: UUID, 
        course_id: UUID = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ChatSession]:
        """Get chat sessions for a user"""
        try:
            query = (
                db.query(ChatSession)
                .filter(ChatSession.user_id == user_id)
                .options(
                    joinedload(ChatSession.user),
                    joinedload(ChatSession.course)
                )
            )
            
            if course_id:
                query = query.filter(ChatSession.course_id == course_id)
            
            return (
                query
                .order_by(desc(ChatSession.started_at))
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting user sessions: {e}")
            raise

    def get_course_activity(
        self, 
        db: Session, 
        course_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get chat activity statistics for a course"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get total messages
            total_messages = (
                db.query(func.count(ChatMessage.id))
                .filter(
                    and_(
                        ChatMessage.course_id == course_id,
                        ChatMessage.timestamp >= cutoff_date
                    )
                )
                .scalar()
            )
            
            # Get active users
            active_users = (
                db.query(func.count(func.distinct(ChatMessage.user_id)))
                .filter(
                    and_(
                        ChatMessage.course_id == course_id,
                        ChatMessage.timestamp >= cutoff_date
                    )
                )
                .scalar()
            )
            
            # Get sessions
            total_sessions = (
                db.query(func.count(ChatSession.id))
                .filter(
                    and_(
                        ChatSession.course_id == course_id,
                        ChatSession.started_at >= cutoff_date
                    )
                )
                .scalar()
            )
            
            return {
                'total_messages': total_messages or 0,
                'active_users': active_users or 0,
                'total_sessions': total_sessions or 0,
                'days': days
            }
        except SQLAlchemyError as e:
            logger.error(f"Error getting course activity: {e}")
            raise

    def archive_old_sessions(self, db: Session, days_old: int = 30) -> List[UUID]:
        """Mark old sessions for archival"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
            
            old_sessions = (
                db.query(ChatSession)
                .filter(
                    and_(
                        ChatSession.started_at < cutoff_date,
                        ChatSession.is_archived == False
                    )
                )
                .all()
            )
            
            session_ids = []
            for session in old_sessions:
                session.is_archived = True
                session_ids.append(session.id)
            
            db.flush()
            return session_ids
        except SQLAlchemyError as e:
            logger.error(f"Error archiving old sessions: {e}")
            raise

# Global instance
chat_repository = ChatRepository()