import { getCurrentUser } from '../auth/auth.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Course {
  id: string;
  name: string;
  code: string; // Maps to course_code in backend
  term: "Fall" | "Winter" | "Summer"; // Maps to semester in backend
  year: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // Note: faculty field removed - not in backend schema
  // Backend may also include:
  instructor?: {
    name: string;
    email: string;
  };
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
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('API Error Details:', errorData);
        if (errorData.detail) {
          errorMessage += ` - ${JSON.stringify(errorData.detail)}`;
        }
      } catch (e) {
        // If we can't parse error response, use the status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    try {
      const result = await this.request<Course[]>('/courses');
      // Ensure we always return an array, even if backend returns different structure
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in getCourses API:', error);
      // Return empty array on error to prevent filter crash
      return [];
    }
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  async createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Course> {
    const user = getCurrentUser();
    console.log('Current user data:', user);
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }
    
    // Map frontend fields to backend expected fields
    const courseData = {
      name: course.name,
      course_code: course.code, // Backend expects 'course_code' not 'code'
      description: course.description,
      semester: course.term, // Backend expects 'semester' not 'term'
      year: course.year,
      instructor_email: user.email, // Associate course with current instructor
    };

    console.log('Creating course with data:', courseData);

    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(courseId: string): Promise<void> {
    return this.request(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    // Map frontend fields to backend expected fields
    const updateData: any = {};
    
    // Map each field that might be updated
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.code !== undefined) updateData.course_code = updates.code;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.term !== undefined) updateData.semester = updates.term; // term -> semester
    if (updates.year !== undefined) updateData.year = updates.year;
    
    // Don't map faculty since it doesn't exist in backend
    // Don't try to update instructor_email via this endpoint

    return this.request<Course>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Material operations
  async getCourseMaterials(courseId: string): Promise<Material[]> {
    return this.request<Material[]>(`/courses/${courseId}/materials`);
  }

  async uploadMaterial(courseId: string, file: File): Promise<Material> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId); // Backend expects 'courseId' not 'course_id'
    
    const user = getCurrentUser();
    if (user) {
      formData.append('userId', user.userId); // Add userId for authentication
    }

    const headers: Record<string, string> = {};
    // Note: Don't set Authorization header for multipart/form-data, use form fields

    console.log('Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      courseId,
      userId: user?.userId
    });

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('Upload error details:', errorData);
        if (errorData.detail) {
          errorDetail = JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // If we can't parse the error response, use the status text
      }
      throw new Error(`Upload failed: ${errorDetail}`);
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
  async createUser(userData: { email: string; displayName?: string; name?: string; role: string }): Promise<Record<string, unknown>> {
    const backendUserData = {
      email: userData.email,
      name: userData.displayName || userData.name || '',
      role: userData.role
    };
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(backendUserData),
    });
  }

  // Traffic analytics
  async getTrafficAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    page_name?: string;
  }): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.page_name) searchParams.set('page_name', params.page_name);
    
    const queryString = searchParams.toString();
    return this.request(`/analytics/traffic${queryString ? `?${queryString}` : ''}`);
  }
}

export const apiService = new ApiService();