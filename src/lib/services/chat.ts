import { db } from '@/lib/firebase/firebase.config';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: Date;
    courseId: string;
    userId?: string;
}

export interface ChatResponse {
    answer: string;
}

export async function storeMessage(message: ChatMessage) {
    try {
        const chatRef = collection(db, 'chats');
        const docRef = await addDoc(chatRef, {
            ...message,
            timestamp: message.timestamp,
        });
        return docRef.id;
    } catch (error) {
        console.error('Error storing message:', error);
        throw error;
    }
}

export async function getChatHistory(courseId: string): Promise<ChatMessage[]> {
    try {
        const chatRef = collection(db, 'chats');
        const q = query(
            chatRef,
            where('courseId', '==', courseId),
            orderBy('timestamp', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: doc.data().timestamp.toDate(),
        })) as ChatMessage[];
    } catch (error) {
        console.error('Error fetching chat history:', error);
        throw error;
    }
}

export async function sendMessage(courseId: string, query: string): Promise<ChatResponse> {
    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: courseId,
                query: query,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get response from AI');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

export async function refreshCourse(courseId: string): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/refresh-course`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                course_id: courseId
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to refresh course content');
        }
    } catch (error) {
        console.error('Error refreshing course:', error);
        throw error;
    }
} 