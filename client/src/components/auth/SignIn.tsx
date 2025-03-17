import { useState } from 'react';
import { signIn } from '@/lib/auth/auth.utils';

interface SignInProps {
    onSignIn?: () => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(token);
            onSignIn?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Sign In</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                        Access Token
                    </label>
                    <input
                        type="password"
                        id="token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="Enter your access token"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
} 