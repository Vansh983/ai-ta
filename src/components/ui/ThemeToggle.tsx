'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
    className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full hover:bg-secondary/80 text-foreground transition-colors duration-200 ${className}`}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun size={20} className="text-yellow-300 transition-transform duration-200 hover:rotate-12" />
            ) : (
                <Moon size={20} className="text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
            )}
        </button>
    );
} 