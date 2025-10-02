import { getCurrentUser } from '../auth/auth.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CourseTerm = 'Fall' | 'Winter' | 'Summer';
type MaterialProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

const isCourseTerm = (value: unknown): value is CourseTerm =>
  value === 'Fall' || value === 'Winter' || value === 'Summer';

const mapSemesterToTerm = (semester?: string): CourseTerm =>
  isCourseTerm(semester) ? semester : 'Fall';

interface BackendInstructor {
  name?: string;
  email?: string;
}

interface BackendCourse {
  id: string;
  name: string;
  course_code: string;
  semester?: CourseTerm;
  year?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  instructor_id?: string;
  instructor?: BackendInstructor;
}

interface CoursesResponse {
  courses?: BackendCourse[];
}

interface BackendMaterial {
  id: string;
  filename?: string;
  file_name?: string;
  file_type?: string;
  fileType?: string;
  uploaded_at?: string;
  uploadedAt?: string;
  processing_status?: MaterialProcessingStatus;
  processingStatus?: MaterialProcessingStatus;
}

interface MaterialsResponse {
  materials?: BackendMaterial[];
}

type CourseUpdatePayload = {
  name?: string;
  course_code?: string;
  description?: string;
  semester?: CourseTerm;
  year?: number;
};

export interface Course {
  id: string;
  name: string;
  code: string; // Maps to course_code in backend
  term: CourseTerm; // Maps to semester in backend
  year: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // Note: faculty field removed - not in backend schema
  // Backend may also include:
  instructor?: {
    name?: string;
    email?: string;
  };
}

export interface Material {
  id: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  processingStatus: MaterialProcessingStatus;
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
  private toCourse(course: BackendCourse): Course {
    return {
      id: course.id,
      name: course.name,
      code: course.course_code,
      term: mapSemesterToTerm(course.semester),
      year: course.year ?? new Date().getFullYear(),
      description: course.description ?? '',
      createdAt: course.created_at ?? new Date().toISOString(),
      updatedAt: course.updated_at ?? new Date().toISOString(),
      userId: course.user_id ?? course.instructor_id ?? '',
      instructor: course.instructor
        ? {
            name: course.instructor.name,
            email: course.instructor.email,
          }
        : undefined,
    };
  }

  private toMaterial(material: BackendMaterial): Material {
    return {
      id: material.id,
      filename: material.filename ?? material.file_name ?? 'unknown',
      fileType: material.file_type ?? material.fileType ?? 'application/octet-stream',
      uploadedAt: material.uploaded_at ?? material.uploadedAt ?? new Date().toISOString(),
      processingStatus: material.processing_status ?? material.processingStatus ?? 'pending',
    };
  }

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

    return response.json() as Promise<T>;
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    try {
      const result = await this.request<CoursesResponse>('/courses');
      // Extract courses array and map backend fields to frontend format
      const courses = result.courses ?? [];
      return courses.map(course => this.toCourse(course));
    } catch (error) {
      console.error('Error in getCourses API:', error);
      // Return empty array on error to prevent filter crash
      return [];
    }
  }

  async getInstructorCourses(): Promise<Course[]> {
    try {
      const result = await this.request<CoursesResponse>('/instructor/courses');
      // Extract courses array and map backend fields to frontend format
      const courses = result.courses ?? [];
      return courses.map(course => this.toCourse(course));
    } catch (error) {
      console.error('Error in getInstructorCourses API:', error);
      // Return empty array on error to prevent filter crash
      return [];
    }
  }

  async getCourse(courseId: string): Promise<Course> {
    const course = await this.request<BackendCourse>(`/courses/${courseId}`);
    return this.toCourse(course);
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

    const createdCourse = await this.request<BackendCourse>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
    return this.toCourse(createdCourse);
  }

  async deleteCourse(courseId: string): Promise<void> {
    return this.request(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    // Map frontend fields to backend expected fields
    const updateData: CourseUpdatePayload = {};
    
    // Map each field that might be updated
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.code !== undefined) updateData.course_code = updates.code;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.term !== undefined) updateData.semester = updates.term; // term -> semester
    if (updates.year !== undefined) updateData.year = updates.year;
    
    // Don't map faculty since it doesn't exist in backend
    // Don't try to update instructor_email via this endpoint

    const updatedCourse = await this.request<BackendCourse>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return this.toCourse(updatedCourse);
  }

  // Material operations
  async getCourseMaterials(courseId: string): Promise<Material[]> {
    try {
      const result = await this.request<MaterialsResponse>(`/courses/${courseId}/materials`);
      // Extract materials array and ensure it's always an array
      const materials = result.materials ?? [];
      return materials.map(material => this.toMaterial(material));
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

    const result = await response.json() as BackendMaterial;
    console.log('Upload response:', result);
    
    // Map the backend response to the Material interface
    return this.toMaterial(result);
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

  async getDetailedCourseAnalytics(courseId: string, days: number = 30): Promise<Record<string, unknown>> {
    return this.request(`/courses/${courseId}/analytics/detailed?days=${days}`);
  }

  async processCourseAnalytics(courseId: string, days: number = 30): Promise<Record<string, unknown>> {
    return this.request(`/courses/${courseId}/analytics/process?days=${days}`, {
      method: 'POST',
    });
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
