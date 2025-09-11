from openai import OpenAI
from config.config import OPENAI_API_KEY
from typing import List, Dict, Optional, Any
from uuid import UUID
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .database.connection import get_database_session
from .repositories.chat_repository import chat_repository
from .repositories.user_repository import user_repository
from .retrieval import retrieve_chunks_text, retrieve_with_context
from .storage.file_operations import chat_archive_service

logger = logging.getLogger(__name__)

def _get_openai_client():
    """Get OpenAI client instance"""
    return OpenAI(api_key=OPENAI_API_KEY)


def store_conversation_in_db(
    db: Session,
    user_id: str, 
    course_id: str, 
    query: str, 
    answer: str
) -> bool:
    """Store a conversation entry in PostgreSQL"""
    try:
        # Skip storing conversations for anonymous users
        if user_id == "anonymous":
            return True

        # Validate inputs
        if not isinstance(user_id, str) or not user_id:
            user_id = "anonymous"
        if not isinstance(course_id, str) or not course_id:
            return False  # Cannot store without a valid courseId
        if not isinstance(query, str):
            query = str(query) if query is not None else ""
        if not isinstance(answer, str):
            answer = str(answer) if answer is not None else ""

        # Convert string IDs to UUIDs
        try:
            user_uuid = UUID(user_id)
            course_uuid = UUID(course_id)
        except ValueError:
            logger.error(f"Invalid UUID format: user_id={user_id}, course_id={course_id}")
            return False

        # Get or create active chat session
        session = chat_repository.get_or_create_active_session(db, user_uuid, course_uuid)

        # Store user message
        chat_repository.add_message(
            db, session.id, user_uuid, course_uuid, query, "user"
        )

        # Store AI response  
        chat_repository.add_message(
            db, session.id, user_uuid, course_uuid, answer, "ai"
        )

        db.commit()
        return True

    except Exception as e:
        logger.error(f"Error storing conversation: {e}")
        db.rollback()
        return False


def store_conversation(user_id: str, course_id: str, query: str, answer: str) -> None:
    """Store a conversation entry - standalone version"""
    with get_database_session() as db:
        store_conversation_in_db(db, user_id, course_id, query, answer)


def get_conversation_history_from_db(
    db: Session,
    user_id: str, 
    course_id: str, 
    limit: int = 3
) -> List[Dict[str, str]]:
    """Retrieves recent conversation history for a student in a course"""
    try:
        # Validate inputs
        if not isinstance(user_id, str) or not user_id or user_id == "anonymous":
            return []  # Return empty history for anonymous users

        if not isinstance(course_id, str) or not course_id:
            return []  # Cannot retrieve without a valid courseId

        if not isinstance(limit, int) or limit <= 0:
            limit = 3  # Default to 3 if invalid limit

        # Convert string IDs to UUIDs
        try:
            user_uuid = UUID(user_id)
            course_uuid = UUID(course_id)
        except ValueError:
            logger.error(f"Invalid UUID format: user_id={user_id}, course_id={course_id}")
            return []

        # Get conversation pairs from repository
        pairs = chat_repository.get_conversation_pairs(db, user_uuid, course_uuid, limit)
        return pairs

    except Exception as e:
        logger.error(f"Error retrieving conversation history: {e}")
        return []


def get_conversation_history(
    user_id: str, course_id: str, limit: int = 3
) -> List[Dict[str, str]]:
    """Retrieves recent conversation history - standalone version"""
    with get_database_session() as db:
        return get_conversation_history_from_db(db, user_id, course_id, limit)


def generate_answer(
    query: str,
    index=None,  # Keep for backward compatibility but not used
    chunks: List[str] = None,   # Keep for backward compatibility but not used
    userId: str = "anonymous",
    courseId: str = "",
    chat_history: Optional[List[Dict[str, str]]] = None,
    use_fallback: bool = False,  # New parameter for fallback mode
) -> str:
    """Generate answer using PostgreSQL-based retrieval and chat history"""
    
    with get_database_session() as db:
        try:
            # Convert courseId to UUID
            try:
                course_uuid = UUID(courseId)
            except ValueError:
                logger.error(f"Invalid course ID format: {courseId}")
                return "I'm sorry, there was an error processing your request. Please check the course ID."

            # If chat_history is not provided, fetch from database
            if chat_history is None and userId != "anonymous":
                chat_history = get_conversation_history_from_db(db, userId, courseId)
            elif chat_history is None:
                chat_history = []  # Empty history for anonymous users

            # Validate chat_history structure
            validated_history = []
            for entry in chat_history:
                if isinstance(entry, dict) and "user" in entry and "assistant" in entry:
                    validated_history.append(
                        {"user": str(entry["user"]), "assistant": str(entry["assistant"])}
                    )

            chat_history = validated_history

            # Retrieve relevant chunks using new PostgreSQL-based retrieval
            context_chunks = []
            materials_used = []
            
            if use_fallback:
                logger.info("Using fallback mode - retrieving material content directly from S3")
                # Fallback: Get material content directly without vector search
                try:
                    from .repositories.material_repository import material_repository
                    from .storage.file_operations import course_file_service
                    
                    # Get processed materials for this course
                    materials = material_repository.get_course_materials(db, course_uuid, include_processed_only=True)
                    
                    for material in materials[:3]:  # Limit to first 3 materials
                        try:
                            if material.s3_key:
                                doc_text = course_file_service.download_and_extract_text(material.s3_key)
                                if doc_text:
                                    # Take first 2000 characters as context
                                    context_chunks.append(doc_text[:2000] + "...")
                                    materials_used.append(material.file_name)
                        except Exception as material_error:
                            logger.warning(f"Could not retrieve content from {material.file_name}: {material_error}")
                            continue
                    
                    if not context_chunks:
                        return "I found course materials but couldn't access their content. Please contact your instructor for assistance."
                        
                except Exception as fallback_error:
                    logger.error(f"Fallback retrieval failed: {fallback_error}")
                    return "I'm currently unable to access the course materials. Please contact your instructor for assistance."
            else:
                # Normal vector-based retrieval
                try:
                    retrieval_result = retrieve_with_context(query, course_uuid, k=5, db=db)
                    context_chunks = retrieval_result['chunks']
                    materials_used = retrieval_result['materials_used']
                except Exception as e:
                    logger.error(f"Error during retrieval: {e}")
                    context_chunks = []
                    materials_used = []

                if not context_chunks:
                    return "I'm sorry, I couldn't find relevant information in the course materials to answer your question. Please try rephrasing your question or consult your course instructor."

            context = "\n\n".join(context_chunks)

            # Format chat history if available
            chat_context = ""
            if chat_history:
                chat_context = "\n".join(
                    [
                        f"Student: {msg['user']}\nAssistant: {msg['assistant']}"
                        for msg in chat_history
                    ]
                )

            # Build the system message with teaching guidelines
            fallback_note = " (Note: The system is currently using a basic content retrieval mode.)" if use_fallback else ""
            system_message = f"""You are a knowledgeable and supportive teaching assistant for a university course{fallback_note}. Your responses must adhere to these principles:

1. Only use information from the provided course materials in your answers
2. If you cannot find relevant information in the context, acknowledge this and suggest the student consult the course instructor
3. For questions seeking help with problems or assignments:
   - Guide students towards the answer rather than providing it directly
   - Use the Socratic method by asking thought-provoking questions
   - Provide hints and suggestions that encourage critical thinking
   - Reference specific course materials that might help them
4. For factual questions about course content:
   - Provide clear, accurate explanations using only the course materials
   - Use examples from the course content when applicable
5. Always maintain a supportive and encouraging tone

Remember: Your goal is to help students learn and think independently, not to simply provide answers."""

            # Construct the messages array with context and query
            messages = [
                {"role": "system", "content": system_message},
                {
                    "role": "user",
                    "content": f"""Here is the relevant context from the course materials:

{context}

Previous conversation:
{chat_context}

Student's question: {query}

Remember to follow the teaching principles in your response.""",
                },
            ]

            client = _get_openai_client()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=0.3,  # Slightly lower temperature for more consistent teaching style
                max_tokens=500,
            )
            answer = response.choices[0].message.content.strip()

            # Store the conversation in PostgreSQL
            store_conversation_in_db(db, userId, courseId, query, answer)
            
            # Archive chat to S3 for analytics processing (async, non-blocking)
            try:
                if userId != "anonymous":
                    # Get the active session for this user/course
                    user_uuid = UUID(userId)
                    course_uuid = UUID(courseId)
                    session = chat_repository.get_or_create_active_session(db, user_uuid, course_uuid)
                    
                    # Prepare chat data for archiving
                    chat_data = {
                        'session_id': str(session.id),
                        'user_id': userId,
                        'course_id': courseId,
                        'query': query,
                        'answer': answer,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'context_chunks': context_chunks[:3] if context_chunks else [],  # Sample for analysis
                        'materials_used': materials_used[:3] if materials_used else []
                    }
                    
                    # Archive to S3 (fire and forget - don't block response)
                    chat_archive_service.archive_chat_session(session.id, chat_data)
                    
            except Exception as archive_error:
                # Don't fail the response if archiving fails
                logger.warning(f"Failed to archive chat to S3: {archive_error}")

            return answer

        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I'm sorry, there was an error processing your request. Please try again later."