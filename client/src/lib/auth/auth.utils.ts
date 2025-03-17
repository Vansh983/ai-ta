import { userTokens, type UserToken } from './tokens.config';

export interface AuthUser {
    userId: string;
    email: string;
    displayName: string;
    role: 'student' | 'instructor' | 'admin';
}

const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `session=${token}; path=/; max-age=3600; samesite=strict`;
};

export const clearAuthToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const signIn = async (token: string): Promise<AuthUser> => {
    const userToken = userTokens.find((ut: UserToken) => ut.token === token);
    if (!userToken) {
        throw new Error('Invalid token');
    }

    setAuthToken(token);
    return {
        userId: userToken.userId,
        email: userToken.email,
        displayName: userToken.displayName,
        role: userToken.role
    };
};

export const signOut = async () => {
    clearAuthToken();
};

export const getCurrentUser = (): AuthUser | null => {
    const token = getAuthToken();
    if (!token) return null;

    const userToken = userTokens.find((ut: UserToken) => ut.token === token);
    if (!userToken) {
        clearAuthToken();
        return null;
    }

    return {
        userId: userToken.userId,
        email: userToken.email,
        displayName: userToken.displayName,
        role: userToken.role
    };
}; 