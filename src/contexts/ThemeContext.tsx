'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeType = 'dark' | 'light';

interface ThemeContextType {
    theme: ThemeType;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeType>('dark');
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage if available (client-side only)
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as ThemeType | null;
        if (!storedTheme) {
            localStorage.setItem('theme', 'dark');
        } else {
            setTheme(storedTheme);
        }
        setMounted(true);
    }, []);

    // Update document class when theme changes
    useEffect(() => {
        if (mounted) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.setItem('theme', theme);
        }
    }, [theme, mounted]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    // Prevent flash of wrong theme
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
} 