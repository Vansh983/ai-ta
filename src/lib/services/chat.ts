const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: Date;
}

export interface ChatResponse {
    answer: string;
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