import { getCurrentUser } from '../auth/auth.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Course {
  id: string;
  name: string;
  code: string;
  faculty: string;
  term: "Fall" | "Winter" | "Summer";
  year: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Material {
  id: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'assistant';
  userId: string;
  courseId: string;
  timestamp: Date | string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const user = getCurrentUser();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (user) {
      headers.Authorization = `Bearer ${user.userId}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return this.request<Course[]>('/courses');
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  async createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Course> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  }

  async deleteCourse(courseId: string): Promise<void> {
    return this.request(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Material operations
  async getCourseMaterials(courseId: string): Promise<Material[]> {
    return this.request<Material[]>(`/courses/${courseId}/materials`);
  }

  async uploadMaterial(courseId: string, file: File): Promise<Material> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);

    const user = getCurrentUser();
    const headers: Record<string, string> = {};
    if (user) {
      headers.Authorization = `Bearer ${user.userId}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async deleteMaterial(materialId: string): Promise<void> {
    return this.request(`/materials/${materialId}`, {
      method: 'DELETE',
    });
  }

  // Chat operations
  async sendChatMessage(courseId: string, message: string): Promise<{ answer: string }> {
    return this.request<{ answer: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        message: message,
      }),
    });
  }

  async getChatHistory(courseId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat-history?course_id=${courseId}`);
  }

  // Analytics
  async getCourseAnalytics(courseId: string): Promise<Record<string, unknown>> {
    return this.request(`/courses/${courseId}/analytics`);
  }

  // User operations
  async createUser(userData: { email: string; displayName: string; role: string }): Promise<Record<string, unknown>> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
}

export const apiService = new ApiService();