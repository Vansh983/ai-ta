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
        // Validate message object
        if (!message.content || !message.courseId) {
            console.error('Invalid message object:', message);
            throw new Error('Invalid message: content and courseId are required');
        }

        // Ensure all fields are of the correct type
        const validatedMessage = {
            content: String(message.content),
            sender: message.sender === 'ai' ? 'ai' : 'user', // Ensure sender is either 'ai' or 'user'
            timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(),
            courseId: String(message.courseId),
            userId: String(message.userId || `guest-${Date.now()}`),
        };

        const chatRef = collection(db, 'chats');
        const docRef = await addDoc(chatRef, validatedMessage);
        return docRef.id;
    } catch (error) {
        console.error('Error storing message:', error);
        throw error;
    }
}

export async function getChatHistory(courseId: string, studentId: string = ''): Promise<ChatMessage[]> {
    try {
        // Validate inputs
        if (!courseId) {
            console.error('Invalid courseId:', courseId);
            throw new Error('CourseId is required');
        }

        const finalStudentId = studentId || `guest-${Date.now()}`;

        const chatRef = collection(db, 'chats');
        const q = query(
            chatRef,
            where('courseId', '==', courseId),
            where('userId', '==', finalStudentId),
            orderBy('timestamp', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const messages: ChatMessage[] = [];

        querySnapshot.docs.forEach(doc => {
            try {
                const data = doc.data();

                // Validate required fields
                if (!data.content || !data.sender) {
                    return; // Skip invalid documents
                }

                // Create a validated message object
                const message: ChatMessage = {
                    id: doc.id,
                    content: String(data.content),
                    sender: data.sender === 'ai' ? 'ai' : 'user',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    courseId: String(data.courseId || courseId),
                    userId: String(data.userId || finalStudentId),
                };

                messages.push(message);
            } catch (error) {
                console.error('Error processing chat message:', error);
                // Skip problematic documents
            }
        });

        return messages;
    } catch (error) {
        console.error('Error fetching chat history:', error);
        throw error;
    }
}

export async function sendMessage(courseId: string, query: string, studentId: string = ''): Promise<ChatResponse> {
    try {
        // Ensure we always have a valid student ID
        const finalStudentId = studentId || `guest-${Date.now()}`;

        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseId: courseId,
                content: query,
                userId: finalStudentId,
                sender: "user"
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

export async function refreshCourse(courseId: string, studentId: string = ''): Promise<void> {
    try {
        const finalStudentId = studentId || `guest-${Date.now()}`;

        const response = await fetch(`${API_URL}/refresh-course`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseId: courseId,
                userId: finalStudentId
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