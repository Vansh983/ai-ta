#!/usr/bin/env python3
"""
Script to populate test users in the database
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from database.connection import get_db_session, init_db
from repositories.user_repository import user_repository
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def populate_users():
    """Populate the database with test users"""
    
    # Test user data based on the provided environment variables
    test_users = [
        {
            "email": "student1@example.com",
            "name": "Student One", 
            "role": "student"
        },
        {
            "email": "student2@example.com",
            "name": "Student Two",
            "role": "student" 
        },
        {
            "email": "student3@example.com",
            "name": "Student Three",
            "role": "student"
        },
        {
            "email": "student4@example.com", 
            "name": "Student Four",
            "role": "student"
        },
        {
            "email": "student5@example.com",
            "name": "Student Five", 
            "role": "student"
        },
        {
            "email": "instructor1@example.com",
            "name": "Instructor One",
            "role": "instructor"
        }
    ]
    
    # Initialize database tables
    logger.info("Initializing database...")
    init_db()
    
    # Create users
    with get_db_session() as db:
        created_users = []
        for user_data in test_users:
            try:
                # Check if user already exists
                existing_user = user_repository.get_by_email(db, user_data["email"])
                if existing_user:
                    logger.info(f"User {user_data['email']} already exists, skipping...")
                    created_users.append(existing_user)
                    continue
                    
                # Create new user
                user = user_repository.create_user(
                    db=db,
                    email=user_data["email"],
                    name=user_data["name"],
                    role=user_data["role"]
                )
                created_users.append(user)
                logger.info(f"Created user: {user.email} ({user.role}) with ID: {user.id}")
                
            except Exception as e:
                logger.error(f"Failed to create user {user_data['email']}: {e}")
                continue
    
    logger.info(f"Successfully processed {len(created_users)} users")
    return created_users

if __name__ == "__main__":
    try:
        users = populate_users()
        logger.info("User population completed successfully!")
        
        # Print user summary
        print("\n=== Created Users Summary ===")
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Name: {user.name}")
            print(f"Role: {user.role}")
            print(f"Created: {user.created_at}")
            print("-" * 40)
            
    except Exception as e:
        logger.error(f"Failed to populate users: {e}")
        sys.exit(1)