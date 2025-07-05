'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, type AuthUser } from '@/lib/auth/auth.utils';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing auth token and user data
        const checkAuth = () => {
            const currentUser = getCurrentUser();
            setUser(currentUser);
            setLoading(false);
        };

        checkAuth();

        // Check auth status when the window regains focus
        const handleFocus = () => {
            checkAuth();
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const value = {
        user,
        loading,
        signOut: async () => {
            await signOut();
            setUser(null);
        },
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
} 