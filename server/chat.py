import openai
from config import OPENAI_API_KEY
from retrieval import retrieve
from typing import List, Dict, Optional, Any
from firebase_utils import db
from datetime import datetime
import faiss

openai.api_key = OPENAI_API_KEY


def store_conversation(userId: str, courseId: str, query: str, answer: str) -> None:
    """
    Stores a conversation entry in Firebase
    """
    # Skip storing conversations for anonymous users
    if userId == "anonymous":
        return

    # Validate inputs
    if not isinstance(userId, str) or not userId:
        userId = "anonymous"
    if not isinstance(courseId, str) or not courseId:
        return  # Cannot store without a valid courseId
    if not isinstance(query, str):
        query = str(query) if query is not None else ""
    if not isinstance(answer, str):
        answer = str(answer) if answer is not None else ""

    chats_ref = db.collection("chats")

    # Store user message
    user_message = {
        "userId": userId,
        "courseId": courseId,
        "timestamp": datetime.now(),
        "content": query,
        "sender": "user",
    }
    chats_ref.add(user_message)

    # Store AI response
    ai_message = {
        "userId": userId,
        "courseId": courseId,
        "timestamp": datetime.now(),
        "content": answer,
        "sender": "ai",
    }
    chats_ref.add(ai_message)


def get_conversation_history(
    userId: str, courseId: str, limit: int = 3
) -> List[Dict[str, str]]:
    """
    Retrieves recent conversation history for a student in a course
    """
    # Validate inputs
    if not isinstance(userId, str) or not userId or userId == "anonymous":
        return []  # Return empty history for anonymous users

    if not isinstance(courseId, str) or not courseId:
        return []  # Cannot retrieve without a valid courseId

    if not isinstance(limit, int) or limit <= 0:
        limit = 3  # Default to 3 if invalid limit

    chats_ref = db.collection("chats")

    # Query the most recent conversations for this student and course
    try:
        query = (
            chats_ref.where("userId", "==", userId)
            .where("courseId", "==", courseId)
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit * 2)  # Fetch more to get pairs of messages
        )

        docs = query.stream()

        # Collect all messages
        messages = []
        for doc in docs:
            try:
                data = doc.to_dict()
                # Validate required fields
                if "content" not in data or "sender" not in data:
                    continue

                messages.append(
                    {
                        "content": str(data.get("content", "")),
                        "sender": str(data.get("sender", "user")),
                        "timestamp": data.get("timestamp", datetime.now()),
                        "courseId": str(data.get("courseId", courseId)),
                        "userId": str(data.get("userId", userId)),
                    }
                )
            except Exception as e:
                print(f"Error processing chat history document: {str(e)}")
                continue

        # Sort by timestamp (oldest first)
        messages.sort(key=lambda x: x.get("timestamp", 0))

        # Group into conversation pairs
        history = []
        i = 0
        while i < len(messages) - 1:
            if (
                messages[i].get("sender") == "user"
                and messages[i + 1].get("sender") == "ai"
            ):
                history.append(
                    {
                        "user": messages[i].get("content", ""),
                        "assistant": messages[i + 1].get("content", ""),
                    }
                )
                i += 2
            else:
                i += 1

        # Limit to the requested number of conversation pairs
        return history[-limit:] if len(history) > limit else history
    except Exception as e:
        print(f"Error retrieving conversation history: {str(e)}")
        return []  # Return empty history on error


def generate_answer(
    query: str,
    index: faiss.Index,
    chunks: List[str],
    userId: str,
    courseId: str,
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> str:

    # If chat_history is not provided, fetch from Firebase
    if chat_history is None and userId != "anonymous":
        chat_history = get_conversation_history(userId, courseId)
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

    # Retrieve relevant chunks
    context_chunks = retrieve(query, index, chunks, k=5)
    context = "\n\n".join(context_chunks)

    # Format chat history if available
    chat_context = ""
    if chat_history:
        chat_context = "\n".join(
            [
                f"Student: {msg['user']}\nAssistant: {msg['assistant']}"
                for msg in chat_history  # Use all provided history
            ]
        )

    # Build the system message with teaching guidelines
    system_message = """You are a knowledgeable and supportive teaching assistant for a university course. Your responses must adhere to these principles:

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

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages,
        temperature=0.3,  # Slightly lower temperature for more consistent teaching style
        max_tokens=500,
    )
    answer = response["choices"][0]["message"]["content"].strip()

    # Store the conversation in Firebase
    store_conversation(userId, courseId, query, answer)

    return answer
