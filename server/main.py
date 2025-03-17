from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
import os
from ingestion import ingest_document
from chat import generate_answer
from firebase_utils import download_file_from_firebase, get_course_files, db
import faiss
import numpy as np
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Any

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for course indexes.
# This dictionary maps course IDs to a tuple: (FAISS index, corresponding chunks)
course_indexes = {}


class QueryRequest(BaseModel):
    courseId: str
    query: str
    userId: Optional[str] = "anonymous"


class RefreshCourseRequest(BaseModel):
    courseId: str
    userId: Optional[str] = "anonymous"


class ChatMessage(BaseModel):
    content: str
    courseId: str
    userId: Optional[str] = "anonymous"
    sender: Optional[str] = "user"


class ChatHistoryRequest(BaseModel):
    courseId: str
    userId: Optional[str] = "anonymous"
    limit: Optional[int] = 10


def load_course_content(courseId: str) -> Tuple[faiss.Index, List[str]]:
    """
    Loads and processes all documents for a course from Firebase Storage
    Returns a tuple of (faiss.Index, list of text chunks)
    """
    # Get all files directly from storage
    file_paths = get_course_files(courseId)
    if not file_paths:
        raise HTTPException(status_code=404, detail="No files found for this course")

    all_chunks = []
    all_embeddings = []
    dimension = None

    # Process each file
    for file_path in file_paths:
        try:
            # Download and process the file
            content = download_file_from_firebase(file_path)
            index, chunks = ingest_document(content)

            # Get embeddings from the index
            embeddings = index.reconstruct_n(0, index.ntotal)

            if dimension is None:
                dimension = embeddings.shape[1]

            all_chunks.extend(chunks)
            all_embeddings.append(embeddings)

        except Exception as e:
            print(f"Error processing file {file_path}: {str(e)}")
            continue

    if not all_chunks:
        raise HTTPException(status_code=500, detail="Failed to process course files")

    # Combine all embeddings
    combined_embeddings = np.vstack(all_embeddings)

    # Create a new combined index
    combined_index = faiss.IndexFlatL2(dimension)
    combined_index.add(combined_embeddings.astype("float32"))

    return combined_index, all_chunks


@app.post("/refresh-course")
async def refresh_course(request: RefreshCourseRequest) -> dict:
    """
    Refreshes the RAG index for a specific course by reprocessing all its files
    """
    # Validate request data
    if not request.courseId:
        raise HTTPException(status_code=400, detail="courseId is required")

    try:
        index, chunks = load_course_content(request.courseId)
        course_indexes[request.courseId] = (index, chunks)
        return {
            "status": "success",
            "message": f"Course {request.courseId} content refreshed successfully",
            "num_documents": len(chunks),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_course(request: QueryRequest) -> dict:
    """
    Queries the course content using RAG
    """
    # Validate request data
    if not request.courseId:
        raise HTTPException(status_code=400, detail="courseId is required")
    if not request.query:
        raise HTTPException(status_code=400, detail="query is required")

    # Ensure userId is a string
    userId = str(request.userId) if request.userId else "anonymous"

    if request.courseId not in course_indexes:
        # Try to load the course content if not in memory
        try:
            index, chunks = load_course_content(request.courseId)
            course_indexes[request.courseId] = (index, chunks)
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    index, chunks = course_indexes[request.courseId]

    try:
        answer = generate_answer(
            query=request.query,
            index=index,
            chunks=chunks,
            userId=userId,
            courseId=request.courseId,
        )
        return {"answer": answer}
    except Exception as e:
        print(f"Error generating answer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate answer")


@app.post("/chat")
async def handle_chat(request: ChatMessage) -> dict:
    """
    Handles a new chat message and returns the AI response
    """
    if request.courseId not in course_indexes:
        # Try to load the course content if not in memory
        try:
            index, chunks = load_course_content(request.courseId)
            course_indexes[request.courseId] = (index, chunks)
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    index, chunks = course_indexes[request.courseId]

    # Get chat history for context
    chat_ref = db.collection("chats")
    history_query = (
        chat_ref.where("userId", "==", request.userId)
        .where("courseId", "==", request.courseId)
        .order_by("timestamp", direction="DESCENDING")
        .limit(6)  # Fetch more messages to get pairs
        .stream()
    )

    # Collect all messages with type safety
    messages = []
    for doc in history_query:
        try:
            data = doc.to_dict()
            # Validate required fields exist
            if "content" not in data or "sender" not in data or "timestamp" not in data:
                continue  # Skip invalid documents

            messages.append(
                {
                    "content": data.get("content", ""),
                    "sender": data.get("sender", "user"),
                    "timestamp": data.get("timestamp", datetime.now(timezone.utc)),
                    "courseId": data.get("courseId", request.courseId),
                    "userId": data.get("userId", request.userId),
                }
            )
        except Exception as e:
            print(f"Error processing chat history document: {str(e)}")
            continue  # Skip problematic documents

    # Sort by timestamp (oldest first)
    messages.sort(key=lambda x: x.get("timestamp", 0))

    # Group into conversation pairs
    chat_history = []
    i = 0
    while i < len(messages) - 1:
        if (
            messages[i].get("sender") == "user"
            and messages[i + 1].get("sender") == "ai"
        ):
            chat_history.append(
                {
                    "user": messages[i].get("content", ""),
                    "assistant": messages[i + 1].get("content", ""),
                }
            )
            i += 2
        else:
            i += 1

    # Limit to last 3 conversation pairs
    chat_history = chat_history[-3:] if len(chat_history) > 3 else chat_history

    # Generate answer with chat history context
    answer = generate_answer(
        query=request.content,  # Use content instead of query
        index=index,
        chunks=chunks,
        userId=request.userId,
        courseId=request.courseId,
        chat_history=chat_history,
    )

    # Store the new conversation in Firebase
    try:
        # Store user message
        chat_ref.add(
            {
                "userId": request.userId,
                "courseId": request.courseId,
                "content": request.content,  # Use content instead of query
                "sender": "user",
                "timestamp": datetime.now(timezone.utc),
            }
        )

        # Store AI response
        chat_ref.add(
            {
                "userId": request.userId,
                "courseId": request.courseId,
                "content": answer,
                "sender": "ai",
                "timestamp": datetime.now(timezone.utc),
            }
        )
    except Exception as e:
        print(f"Error storing chat in Firebase: {str(e)}")
        # Continue even if storage fails, so the user still gets their answer

    return {"answer": answer}


@app.get("/chat-history")
async def get_chat_history(
    courseId: str, userId: str = "anonymous", limit: int = 10
) -> dict:
    """
    Retrieves chat history for a student in a course
    """
    # Validate inputs
    if not courseId:
        raise HTTPException(status_code=400, detail="courseId is required")

    # Validate and sanitize userId
    userId = str(userId) if userId else "anonymous"

    # Validate limit
    try:
        limit = int(limit)
        if limit <= 0:
            limit = 10
    except (ValueError, TypeError):
        limit = 10

    # Return empty history for anonymous users
    if userId == "anonymous":
        return {"history": []}

    try:
        chat_ref = db.collection("chats")
        history_query = (
            chat_ref.where("userId", "==", userId)
            .where("courseId", "==", courseId)
            .order_by("timestamp", direction="ASCENDING")
            .stream()
        )

        history = []
        for doc in history_query:
            try:
                data = doc.to_dict()
                # Validate required fields
                if "content" not in data or "sender" not in data:
                    continue

                # Format timestamp
                timestamp = None
                if data.get("timestamp"):
                    try:
                        timestamp = data["timestamp"].isoformat()
                    except:
                        timestamp = None

                history.append(
                    {
                        "id": doc.id,
                        "content": str(data.get("content", "")),
                        "sender": str(data.get("sender", "user")),
                        "timestamp": timestamp,
                    }
                )
            except Exception as e:
                print(f"Error processing chat history document: {str(e)}")
                continue

        return {"history": history}

    except Exception as e:
        print(f"Error retrieving chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
