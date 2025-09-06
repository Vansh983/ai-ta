'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth/auth.utils';

interface SignInFormProps {
  onSignIn?: () => void;
}

export function SignInForm({ onSignIn }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email.trim());
      onSignIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignIn = (userEmail: string) => {
    setEmail(userEmail);
  };

  return (
    <div className="w-full max-w-md p-6 border border-gray-300 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Sign In</h2>
        <p className="text-gray-600">
          Enter your email address to sign in to the AI Teaching Assistant
        </p>
      </div>
      
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-sm text-gray-600">Quick sign in as:</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickSignIn('student1@example.com')}
              disabled={loading}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Student One
            </button>
            <button
              onClick={() => handleQuickSignIn('instructor1@example.com')}
              disabled={loading}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Instructor One
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}