import { useState } from 'react';
import { signIn } from '@/lib/auth/auth.utils';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface SignInProps {
    onSignIn?: () => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
    const { refreshUser } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email);
            // Refresh the auth context to pick up the new user
            refreshUser();
            onSignIn?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-semibold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400">Sign in to continue to AI Teaching Assistant</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-[#463239] text-[#FF4444] rounded-lg border border-[#FF4444]/20">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-[#40414F] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent placeholder-gray-500"
                        required
                        placeholder="Enter your email"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white bg-[#19C37D] hover:bg-[#15A36B] focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:ring-offset-2 focus:ring-offset-[#343541] transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-gray-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="text-[#19C37D] hover:text-[#15A36B]">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
} 