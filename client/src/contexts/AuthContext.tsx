'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, type AuthUser } from '@/lib/auth/auth.utils';
import { getUserData, type UserRole } from '@/lib/firebase/user.utils';

interface AuthContextType {
    user: AuthUser | null;
    userRole: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userRole: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing auth token and user data
        const checkAuth = async () => {
            const currentUser = getCurrentUser();
            setUser(currentUser);

            if (currentUser) {
                const userData = await getUserData(currentUser.uid);
                setUserRole(userData?.role || null);
            } else {
                setUserRole(null);
            }

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
        userRole,
        loading,
        signOut: async () => {
            await signOut();
            setUser(null);
            setUserRole(null);
        },
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
} 