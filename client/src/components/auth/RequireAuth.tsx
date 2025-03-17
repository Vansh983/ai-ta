'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { type Role } from '@/lib/auth/auth.utils';

interface RequireAuthProps {
    children: React.ReactNode;
    allowedRoles: Role[];
    redirectTo?: string;
}

export default function RequireAuth({
    children,
    allowedRoles,
    redirectTo = '/login'
}: RequireAuthProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !allowedRoles.includes(user.role))) {
            router.replace(redirectTo);
        }
    }, [user, loading, allowedRoles, redirectTo, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
} 