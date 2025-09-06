"""
Authentication utilities and middleware for AI Teaching Assistant
"""
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import logging
from uuid import UUID

from .database.connection import get_database_session
from .repositories.user_repository import user_repository
from .database.models import User

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

class AuthError(HTTPException):
    """Custom authentication error"""
    def __init__(self, detail: str):
        super().__init__(status_code=401, detail=detail)

def get_current_user(
    request: Request,
    db: Session = Depends(get_database_session),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    Get current authenticated user from request.
    
    For development, we support both:
    1. Bearer token in Authorization header
    2. User email in x-user-email header for testing
    """
    
    # Check for Bearer token first
    if credentials:
        token = credentials.credentials
        # For now, we'll use a simple token mapping
        # In production, this should be JWT or proper OAuth
        user = _get_user_by_token(db, token)
        if user:
            return user
    
    # Check for development header
    user_email = request.headers.get('x-user-email')
    if user_email:
        user = user_repository.get_by_email(db, user_email)
        if user and user.is_active:
            return user
        else:
            raise AuthError(f"User with email {user_email} not found or inactive")
    
    # Check for user ID header (for compatibility)
    user_id_header = request.headers.get('x-user-id')
    if user_id_header:
        try:
            user_id = UUID(user_id_header)
            user = user_repository.get_by_id(db, user_id)
            if user and user.is_active:
                return user
        except (ValueError, TypeError):
            pass
    
    raise AuthError("Authentication required. Provide Bearer token or x-user-email header.")

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_database_session),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Get current user, but don't raise error if not authenticated.
    Returns None if no valid authentication is provided.
    """
    try:
        return get_current_user(request, db, credentials)
    except AuthError:
        return None

def _get_user_by_token(db: Session, token: str) -> Optional[User]:
    """
    Map tokens to users for development.
    In production, this should validate JWT tokens.
    """
    # Development token mapping based on the env variables
    token_to_email = {
        "gfhbdvjk": [  # Student token
            "student1@example.com",
            "student2@example.com", 
            "student3@example.com",
            "student4@example.com",
            "student5@example.com"
        ],
        "fwefsdefc": [  # Instructor token
            "instructor1@example.com"
        ]
    }
    
    # For development, we'll just use the first email for each token
    # In production, tokens should be unique per user
    if token in token_to_email:
        email = token_to_email[token][0]  # Use first email for now
        user = user_repository.get_by_email(db, email)
        if user and user.is_active:
            return user
    
    return None

def require_role(allowed_roles: list[str]):
    """
    Decorator to require specific roles.
    Usage: @require_role(['instructor', 'admin'])
    """
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_dependency

def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    """Require instructor role"""
    if current_user.role not in ['instructor', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Instructor role required."
        )
    return current_user

def require_student_or_instructor(current_user: User = Depends(get_current_user)) -> User:
    """Require student or instructor role"""
    if current_user.role not in ['student', 'instructor', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Student or instructor role required."
        )
    return current_user