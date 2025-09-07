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
      // Send email in x-user-email header for backend authentication
      headers['x-user-email'] = user.email;
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
      const result = await this.request<{courses: any[]}>('/courses');
      // Extract courses array and map backend fields to frontend format
      const courses = result.courses || [];
      return courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.course_code, // Map course_code to code
        term: course.semester as "Fall" | "Winter" | "Summer", // Map semester to term
        year: course.year,
        description: course.description,
        createdAt: course.created_at || new Date().toISOString(), // Map created_at to createdAt
        updatedAt: course.updated_at || new Date().toISOString(), // Map updated_at to updatedAt
        userId: course.user_id || course.instructor_id, // Map user_id/instructor_id to userId
        instructor: course.instructor
      }));
    } catch (error) {
      console.error('Error in getCourses API:', error);
      // Return empty array on error to prevent filter crash
      return [];
    }
  }

  async getInstructorCourses(): Promise<Course[]> {
    try {
      const result = await this.request<{courses: any[]}>('/instructor/courses');
      // Extract courses array and map backend fields to frontend format
      const courses = result.courses || [];
      return courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.course_code, // Map course_code to code
        term: course.semester as "Fall" | "Winter" | "Summer", // Map semester to term
        year: course.year,
        description: course.description,
        createdAt: course.created_at || new Date().toISOString(), // Map created_at to createdAt
        updatedAt: course.updated_at || new Date().toISOString(), // Map updated_at to updatedAt
        userId: course.user_id || course.instructor_id, // Map user_id/instructor_id to userId
        instructor: course.instructor
      }));
    } catch (error) {
      console.error('Error in getInstructorCourses API:', error);
      // Return empty array on error to prevent filter crash
      return [];
    }
  }

  async getCourse(courseId: string): Promise<Course> {
    const course = await this.request<any>(`/courses/${courseId}`);
    // Map backend fields to frontend format
    return {
      id: course.id,
      name: course.name,
      code: course.course_code, // Map course_code to code
      term: course.semester as "Fall" | "Winter" | "Summer", // Map semester to term
      year: course.year,
      description: course.description,
      createdAt: course.created_at || new Date().toISOString(), // Map created_at to createdAt
      updatedAt: course.updated_at || new Date().toISOString(), // Map updated_at to updatedAt
      userId: course.user_id || course.instructor_id, // Map user_id/instructor_id to userId
      instructor: course.instructor
    };
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

    const createdCourse = await this.request<any>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
    // Map backend fields to frontend format
    return {
      id: createdCourse.id,
      name: createdCourse.name,
      code: createdCourse.course_code, // Map course_code to code
      term: createdCourse.semester as "Fall" | "Winter" | "Summer", // Map semester to term
      year: createdCourse.year,
      description: createdCourse.description,
      createdAt: createdCourse.created_at || new Date().toISOString(), // Map created_at to createdAt
      updatedAt: createdCourse.updated_at || new Date().toISOString(), // Map updated_at to updatedAt
      userId: createdCourse.user_id || createdCourse.instructor_id, // Map user_id/instructor_id to userId
      instructor: createdCourse.instructor
    };
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

    const updatedCourse = await this.request<any>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    // Map backend fields to frontend format
    return {
      id: updatedCourse.id,
      name: updatedCourse.name,
      code: updatedCourse.course_code, // Map course_code to code
      term: updatedCourse.semester as "Fall" | "Winter" | "Summer", // Map semester to term
      year: updatedCourse.year,
      description: updatedCourse.description,
      createdAt: updatedCourse.created_at || new Date().toISOString(), // Map created_at to createdAt
      updatedAt: updatedCourse.updated_at || new Date().toISOString(), // Map updated_at to updatedAt
      userId: updatedCourse.user_id || updatedCourse.instructor_id, // Map user_id/instructor_id to userId
      instructor: updatedCourse.instructor
    };
  }

  // Material operations
  async getCourseMaterials(courseId: string): Promise<Material[]> {
    try {
      const result = await this.request<{materials: any[]}>(`/courses/${courseId}/materials`);
      // Extract materials array and ensure it's always an array
      const materials = result.materials || [];
      return materials.map(material => ({
        id: material.id,
        filename: material.filename,
        fileType: material.file_type || material.fileType,
        uploadedAt: material.uploaded_at || material.uploadedAt || new Date().toISOString(),
        processingStatus: material.processing_status || material.processingStatus || 'pending'
      }));
    } catch (error) {
      console.error('Error in getCourseMaterials API:', error);
      // Return empty array on error to prevent crash
      return [];
    }
  }

  async uploadMaterial(courseId: string, file: File): Promise<Material> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    formData.append('userId', user.uid || user.userId || 'anonymous');

    const headers: Record<string, string> = {};
    // Add user email for backend authentication
    if (user.email) {
      headers['x-user-email'] = user.email;
    }

    console.log('Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      courseId,
      userId: user.uid || user.userId,
      userEmail: user.email
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

    const result = await response.json();
    console.log('Upload response:', result);
    
    // Map the backend response to the Material interface
    return {
      id: result.id,
      filename: result.file_name || result.filename,
      fileType: result.file_type || result.fileType,
      uploadedAt: result.uploaded_at || result.uploadedAt || new Date().toISOString(),
      processingStatus: result.processing_status || result.processingStatus || 'pending'
    };
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
        courseId: courseId,
        content: message,
      }),
    });
  }

  async getChatHistory(courseId: string): Promise<ChatMessage[]> {
    const response = await this.request<{ history: ChatMessage[] }>(`/chat-history?courseId=${courseId}`);
    return response.history;
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