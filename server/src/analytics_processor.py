"""
Analytics processing service for generating course metrics from chat data
"""
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from uuid import UUID
from collections import Counter, defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
import numpy as np

from .database.models import (
    ChatMessage, ChatSession, Course, CourseAnalytics, 
    UserAnalytics, CourseMaterial, VectorEmbedding
)
from .repositories.chat_repository import chat_repository
from .repositories.analytics_repository import analytics_repository
from .storage.file_operations import chat_archive_service

logger = logging.getLogger(__name__)

class AnalyticsProcessor:
    """Process chat data to generate analytics metrics"""
    
    def __init__(self):
        self.common_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 
            'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'i',
            'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
            'your', 'his', 'her', 'its', 'our', 'their', 'what', 'when', 'where', 'why', 'how'
        }
        
        # Topic categories for educational content
        self.topic_categories = {
            'programming': ['code', 'programming', 'function', 'variable', 'method', 'class', 'object', 'syntax', 'debug'],
            'algorithms': ['algorithm', 'sorting', 'searching', 'complexity', 'big-o', 'optimization', 'recursive', 'iteration'],
            'data_structures': ['array', 'list', 'stack', 'queue', 'tree', 'graph', 'hash', 'linked', 'binary'],
            'databases': ['database', 'sql', 'query', 'table', 'index', 'join', 'normalization', 'transaction'],
            'mathematics': ['math', 'equation', 'formula', 'calculation', 'proof', 'theorem', 'statistics', 'probability'],
            'concepts': ['concept', 'theory', 'principle', 'definition', 'explain', 'understand', 'learn', 'study'],
            'debugging': ['error', 'bug', 'debug', 'fix', 'problem', 'issue', 'exception', 'crash'],
            'testing': ['test', 'testing', 'unit', 'integration', 'validation', 'verify', 'assert', 'mock']
        }

    def extract_keywords(self, text: str, min_length: int = 3, max_words: int = 20) -> List[str]:
        """Extract meaningful keywords from text"""
        try:
            # Clean and normalize text
            text = re.sub(r'[^\w\s]', ' ', text.lower())
            words = text.split()
            
            # Filter out common words and short words
            keywords = [
                word for word in words 
                if len(word) >= min_length and word not in self.common_words
            ]
            
            # Count frequency and return top keywords
            word_counts = Counter(keywords)
            return [word for word, count in word_counts.most_common(max_words)]
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []

    def categorize_topic(self, keywords: List[str]) -> str:
        """Categorize message topic based on keywords"""
        try:
            category_scores = defaultdict(int)
            
            for keyword in keywords:
                for category, category_keywords in self.topic_categories.items():
                    if keyword in category_keywords:
                        category_scores[category] += 1
            
            if not category_scores:
                return 'general'
            
            # Return category with highest score
            return max(category_scores, key=category_scores.get)
            
        except Exception as e:
            logger.error(f"Error categorizing topic: {e}")
            return 'general'

    def calculate_session_duration(self, session: ChatSession, messages: List[ChatMessage]) -> Optional[timedelta]:
        """Calculate session duration from first to last message"""
        try:
            if not messages:
                return None
            
            first_message = min(messages, key=lambda m: m.timestamp)
            last_message = max(messages, key=lambda m: m.timestamp)
            
            return last_message.timestamp - first_message.timestamp
            
        except Exception as e:
            logger.error(f"Error calculating session duration: {e}")
            return None

    def calculate_engagement_metrics(self, messages: List[ChatMessage]) -> Dict[str, Any]:
        """Calculate engagement metrics from messages"""
        try:
            total_messages = len(messages)
            if total_messages == 0:
                return {'total_messages': 0, 'avg_message_length': 0, 'question_ratio': 0}
            
            user_messages = [m for m in messages if m.sender == 'user']
            ai_messages = [m for m in messages if m.sender == 'ai']
            
            # Calculate average message length
            avg_user_length = np.mean([len(m.content) for m in user_messages]) if user_messages else 0
            avg_ai_length = np.mean([len(m.content) for m in ai_messages]) if ai_messages else 0
            
            # Count questions (messages ending with ?)
            questions = sum(1 for m in user_messages if m.content.strip().endswith('?'))
            question_ratio = questions / len(user_messages) if user_messages else 0
            
            return {
                'total_messages': total_messages,
                'user_messages': len(user_messages),
                'ai_messages': len(ai_messages),
                'avg_user_message_length': round(avg_user_length, 2),
                'avg_ai_message_length': round(avg_ai_length, 2),
                'question_ratio': round(question_ratio, 3),
                'questions_asked': questions
            }
            
        except Exception as e:
            logger.error(f"Error calculating engagement metrics: {e}")
            return {'total_messages': 0, 'avg_message_length': 0, 'question_ratio': 0}

    def process_course_analytics(
        self, 
        db: Session, 
        course_id: UUID, 
        days: int = 30
    ) -> Dict[str, Any]:
        """Process analytics for a specific course"""
        try:
            logger.info(f"Processing analytics for course {course_id} over {days} days")
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get all chat messages for the course in the time period
            messages = db.query(ChatMessage).filter(
                and_(
                    ChatMessage.course_id == course_id,
                    ChatMessage.timestamp >= cutoff_date
                )
            ).order_by(ChatMessage.timestamp).all()
            
            if not messages:
                logger.info(f"No messages found for course {course_id}")
                return self._empty_analytics()
            
            # Get unique sessions and users
            sessions = db.query(ChatSession).filter(
                ChatSession.course_id == course_id
            ).all()
            
            unique_users = set(m.user_id for m in messages)
            
            # Process keywords and topics
            all_keywords = []
            topic_distribution = Counter()
            daily_activity = defaultdict(lambda: {'queries': 0, 'users': set()})
            hourly_activity = defaultdict(int)
            
            # Group messages by session for analysis
            session_messages = defaultdict(list)
            for message in messages:
                session_messages[message.session_id].append(message)
                
                # Extract keywords from user messages
                if message.sender == 'user':
                    keywords = self.extract_keywords(message.content)
                    all_keywords.extend(keywords)
                    
                    # Categorize topic
                    topic = self.categorize_topic(keywords)
                    topic_distribution[topic] += 1
                    
                    # Daily activity tracking
                    date_key = message.timestamp.date()
                    daily_activity[date_key]['queries'] += 1
                    daily_activity[date_key]['users'].add(message.user_id)
                    
                    # Hourly activity tracking
                    hour_key = message.timestamp.hour
                    hourly_activity[hour_key] += 1
            
            # Calculate session metrics
            session_durations = []
            total_sessions = len(session_messages)
            
            for session_id, session_msgs in session_messages.items():
                session = next((s for s in sessions if s.id == session_id), None)
                if session:
                    duration = self.calculate_session_duration(session, session_msgs)
                    if duration and duration.total_seconds() > 0:
                        session_durations.append(duration.total_seconds())
            
            avg_session_duration = np.mean(session_durations) if session_durations else 0
            
            # Get material usage statistics
            material_usage = self._calculate_material_usage(db, course_id, messages)
            
            # Calculate engagement metrics
            engagement = self.calculate_engagement_metrics(messages)
            
            # Generate activity patterns
            activity_patterns = self._generate_activity_patterns(daily_activity, hourly_activity)
            
            # Compile analytics results
            analytics_result = {
                'course_id': str(course_id),
                'period_days': days,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'overview': {
                    'total_queries': engagement['user_messages'],
                    'active_users': len(unique_users),
                    'total_sessions': total_sessions,
                    'avg_session_duration_minutes': round(avg_session_duration / 60, 2),
                },
                'engagement': engagement,
                'topics': {
                    'distribution': dict(topic_distribution.most_common(10)),
                    'popular_keywords': Counter(all_keywords).most_common(20)
                },
                'activity_patterns': activity_patterns,
                'material_usage': material_usage,
                'peak_hours': self._calculate_peak_hours(hourly_activity),
                'growth_metrics': self._calculate_growth_metrics(db, course_id, days)
            }
            
            # Store analytics in database
            self._store_course_analytics(db, course_id, analytics_result)
            
            logger.info(f"Successfully processed analytics for course {course_id}")
            return analytics_result
            
        except Exception as e:
            logger.error(f"Error processing course analytics: {e}")
            raise

    def _calculate_material_usage(
        self, 
        db: Session, 
        course_id: UUID, 
        messages: List[ChatMessage]
    ) -> Dict[str, Any]:
        """Calculate which materials are being referenced in chats"""
        try:
            # Get course materials
            materials = db.query(CourseMaterial).filter(
                CourseMaterial.course_id == course_id
            ).all()
            
            material_references = defaultdict(int)
            
            # Check retrieval context in messages for material usage
            for message in messages:
                if message.retrieval_context and isinstance(message.retrieval_context, dict):
                    materials_used = message.retrieval_context.get('materials_used', [])
                    for material_name in materials_used:
                        material_references[material_name] += 1
            
            return {
                'total_materials': len(materials),
                'referenced_materials': len(material_references),
                'material_popularity': dict(Counter(material_references).most_common(10)),
                'usage_rate': len(material_references) / len(materials) if materials else 0
            }
            
        except Exception as e:
            logger.error(f"Error calculating material usage: {e}")
            return {'total_materials': 0, 'referenced_materials': 0, 'material_popularity': {}, 'usage_rate': 0}

    def _generate_activity_patterns(
        self, 
        daily_activity: Dict, 
        hourly_activity: Dict
    ) -> Dict[str, Any]:
        """Generate activity pattern analysis"""
        try:
            # Convert daily activity to time series
            daily_series = []
            for date, data in daily_activity.items():
                daily_series.append({
                    'date': date.isoformat(),
                    'queries': data['queries'],
                    'active_users': len(data['users'])
                })
            
            # Sort by date
            daily_series.sort(key=lambda x: x['date'])
            
            # Generate hourly distribution
            hourly_series = []
            for hour in range(24):
                hourly_series.append({
                    'hour': hour,
                    'activity': hourly_activity.get(hour, 0)
                })
            
            return {
                'daily_activity': daily_series,
                'hourly_distribution': hourly_series
            }
            
        except Exception as e:
            logger.error(f"Error generating activity patterns: {e}")
            return {'daily_activity': [], 'hourly_distribution': []}

    def _calculate_peak_hours(self, hourly_activity: Dict[int, int]) -> Dict[str, Any]:
        """Calculate peak usage hours"""
        try:
            if not hourly_activity:
                return {'peak_hour': 14, 'peak_activity': 0, 'off_peak_hours': []}
            
            peak_hour = max(hourly_activity, key=hourly_activity.get)
            peak_activity = hourly_activity[peak_hour]
            
            # Find off-peak hours (bottom 25%)
            sorted_hours = sorted(hourly_activity.items(), key=lambda x: x[1])
            off_peak_count = max(1, len(sorted_hours) // 4)
            off_peak_hours = [hour for hour, activity in sorted_hours[:off_peak_count]]
            
            return {
                'peak_hour': peak_hour,
                'peak_activity': peak_activity,
                'off_peak_hours': off_peak_hours
            }
            
        except Exception as e:
            logger.error(f"Error calculating peak hours: {e}")
            return {'peak_hour': 14, 'peak_activity': 0, 'off_peak_hours': []}

    def _calculate_growth_metrics(
        self, 
        db: Session, 
        course_id: UUID, 
        days: int
    ) -> Dict[str, Any]:
        """Calculate growth metrics comparing current vs previous period"""
        try:
            current_end = datetime.now(timezone.utc)
            current_start = current_end - timedelta(days=days)
            previous_start = current_start - timedelta(days=days)
            
            # Current period metrics
            current_messages = db.query(func.count(ChatMessage.id)).filter(
                and_(
                    ChatMessage.course_id == course_id,
                    ChatMessage.timestamp >= current_start,
                    ChatMessage.timestamp < current_end,
                    ChatMessage.sender == 'user'
                )
            ).scalar() or 0
            
            current_users = db.query(func.count(func.distinct(ChatMessage.user_id))).filter(
                and_(
                    ChatMessage.course_id == course_id,
                    ChatMessage.timestamp >= current_start,
                    ChatMessage.timestamp < current_end
                )
            ).scalar() or 0
            
            # Previous period metrics
            previous_messages = db.query(func.count(ChatMessage.id)).filter(
                and_(
                    ChatMessage.course_id == course_id,
                    ChatMessage.timestamp >= previous_start,
                    ChatMessage.timestamp < current_start,
                    ChatMessage.sender == 'user'
                )
            ).scalar() or 0
            
            previous_users = db.query(func.count(func.distinct(ChatMessage.user_id))).filter(
                and_(
                    ChatMessage.course_id == course_id,
                    ChatMessage.timestamp >= previous_start,
                    ChatMessage.timestamp < current_start
                )
            ).scalar() or 0
            
            # Calculate growth percentages
            message_growth = ((current_messages - previous_messages) / previous_messages * 100) if previous_messages > 0 else 0
            user_growth = ((current_users - previous_users) / previous_users * 100) if previous_users > 0 else 0
            
            return {
                'current_period': {
                    'queries': current_messages,
                    'users': current_users
                },
                'previous_period': {
                    'queries': previous_messages,
                    'users': previous_users
                },
                'growth': {
                    'queries_percent': round(message_growth, 1),
                    'users_percent': round(user_growth, 1)
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating growth metrics: {e}")
            return {
                'current_period': {'queries': 0, 'users': 0},
                'previous_period': {'queries': 0, 'users': 0},
                'growth': {'queries_percent': 0, 'users_percent': 0}
            }

    def _store_course_analytics(
        self, 
        db: Session, 
        course_id: UUID, 
        analytics_data: Dict[str, Any]
    ) -> None:
        """Store processed analytics in the database"""
        try:
            today = datetime.now(timezone.utc).date()
            
            # Check if analytics already exist for today
            existing = db.query(CourseAnalytics).filter(
                and_(
                    CourseAnalytics.course_id == course_id,
                    CourseAnalytics.date == today
                )
            ).first()
            
            overview = analytics_data['overview']
            topics = analytics_data['topics']
            material_usage = analytics_data['material_usage']
            peak_hours = analytics_data['peak_hours']
            engagement = analytics_data['engagement']
            activity_patterns = analytics_data['activity_patterns']
            
            if existing:
                # Update existing record
                existing.active_users = overview['active_users']
                existing.total_queries = overview['total_queries']
                existing.popular_topics = topics['distribution']
                existing.avg_session_duration = timedelta(minutes=overview['avg_session_duration_minutes'])
                existing.material_usage = material_usage
                existing.peak_usage_hours = peak_hours
                existing.engagement_metrics = engagement
                existing.activity_patterns = activity_patterns
            else:
                # Create new record
                new_analytics = CourseAnalytics(
                    course_id=course_id,
                    date=today,
                    active_users=overview['active_users'],
                    total_queries=overview['total_queries'],
                    popular_topics=topics['distribution'],
                    avg_session_duration=timedelta(minutes=overview['avg_session_duration_minutes']),
                    material_usage=material_usage,
                    peak_usage_hours=peak_hours,
                    engagement_metrics=engagement,
                    activity_patterns=activity_patterns
                )
                db.add(new_analytics)
            
            db.commit()
            logger.info(f"Stored analytics for course {course_id} on {today}")
            
        except Exception as e:
            logger.error(f"Error storing course analytics: {e}")
            db.rollback()
            raise

    def _empty_analytics(self) -> Dict[str, Any]:
        """Return empty analytics structure"""
        return {
            'overview': {
                'total_queries': 0,
                'active_users': 0,
                'total_sessions': 0,
                'avg_session_duration_minutes': 0
            },
            'engagement': {
                'total_messages': 0,
                'question_ratio': 0
            },
            'topics': {
                'distribution': {},
                'popular_keywords': []
            },
            'activity_patterns': {
                'daily_activity': [],
                'hourly_distribution': []
            },
            'material_usage': {
                'total_materials': 0,
                'referenced_materials': 0,
                'material_popularity': {},
                'usage_rate': 0
            }
        }

# Create global instance
analytics_processor = AnalyticsProcessor()