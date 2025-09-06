import { AuthUser } from '../auth/auth.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: 'student' | 'instructor' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AuthResponse {
  user: ApiUserResponse;
  message: string;
}

export class AuthAPI {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(error.detail || 'Authentication failed');
    }

    return response.json();
  }

  static async verifyUser(email: string): Promise<AuthResponse> {
    return this.makeRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async getCurrentUser(email: string): Promise<ApiUserResponse> {
    return this.makeRequest('/auth/me', {
      headers: {
        'x-user-email': email,
      },
    });
  }

  static async listUsers(email: string): Promise<ApiUserResponse[]> {
    return this.makeRequest('/auth/users', {
      headers: {
        'x-user-email': email,
      },
    });
  }
}

export function convertApiUserToAuthUser(apiUser: ApiUserResponse): AuthUser {
  return {
    userId: apiUser.id,
    uid: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.name || apiUser.email,
    role: apiUser.role,
  };
}