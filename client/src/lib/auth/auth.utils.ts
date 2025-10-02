import { AuthAPI, convertApiUserToAuthUser } from '../api/auth';

export interface AuthUser {
    userId: string;
    uid: string; // Alias for userId to maintain compatibility
    email: string;
    displayName: string;
    role: 'student' | 'instructor' | 'admin';
}

export type Role = AuthUser['role'];

const USER_EMAIL_KEY = 'user_email';
const USER_ID_KEY = 'user_id';
const USER_DATA_KEY = 'user_data';

// Role checking utilities
export const isInstructor = (user: AuthUser | null): boolean => {
    return user?.role === 'instructor' || user?.role === 'admin';
};

export const isStudent = (user: AuthUser | null): boolean => {
    return user?.role === 'student';
};

export const isAdmin = (user: AuthUser | null): boolean => {
    return user?.role === 'admin';
};

// Role-based access control HOC
export const requireRole = (allowedRoles: Role[]): boolean => {
    const user = getCurrentUser();
    return user !== null && allowedRoles.includes(user.role);
};

export const setUserData = (user: AuthUser) => {
    localStorage.setItem(USER_EMAIL_KEY, user.email);
    localStorage.setItem(USER_ID_KEY, user.userId);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
};

export const clearAuthData = () => {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_DATA_KEY);
};

export const getUserEmail = (): string | null => {
    return localStorage.getItem(USER_EMAIL_KEY);
};

export const getUserId = (): string | null => {
    return localStorage.getItem(USER_ID_KEY);
};

export const signIn = async (email: string): Promise<AuthUser> => {
    try {
        const response = await AuthAPI.verifyUser(email);
        const authUser = convertApiUserToAuthUser(response.user);
        
        // Store user data in localStorage
        setUserData(authUser);
        
        return authUser;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Authentication failed');
    }
};

export const signOut = async () => {
    clearAuthData();
};

export const getCurrentUser = (): AuthUser | null => {
    const userDataString = localStorage.getItem(USER_DATA_KEY);
    if (!userDataString) return null;

    try {
        const userData = JSON.parse(userDataString) as AuthUser;
        return userData;
    } catch (error) {
        // If data is corrupted, clear it and return null
        clearAuthData();
        return null;
    }
}; 