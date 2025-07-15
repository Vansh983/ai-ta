import { useState } from 'react';
import { signUp } from '@/lib/firebase/auth.utils';
import { createUserDocument, UserRole } from '@/lib/firebase/user.utils';
import Link from 'next/link';

interface SignUpProps {
    onSignUp?: () => void;
}

export default function SignUp({ onSignUp }: SignUpProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const user = await signUp(email, password);
            await createUserDocument(user, role);
            onSignUp?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-semibold text-white mb-2">Create Account</h2>
                <p className="text-gray-400">Join AI Teaching Assistant today</p>
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

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                        Role
                    </label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full p-3 bg-[#40414F] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent"
                        required
                    >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-[#40414F] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent placeholder-gray-500"
                        required
                        minLength={6}
                        placeholder="Enter your password"
                    />
                    <p className="mt-2 text-xs text-gray-400">
                        Must be at least 6 characters long
                    </p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-[#40414F] text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent placeholder-gray-500"
                        required
                        minLength={6}
                        placeholder="Confirm your password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white bg-[#19C37D] hover:bg-[#15A36B] focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:ring-offset-2 focus:ring-offset-[#343541] transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-gray-400">
                    Already have an account?{' '}
                    <Link href="/signin" className="text-[#19C37D] hover:text-[#15A36B]">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
} 