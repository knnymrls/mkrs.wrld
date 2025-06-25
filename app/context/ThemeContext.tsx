'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        
        if (theme === 'system') {
            // Remove manual theme classes and let CSS media query handle it
            root.classList.remove('light', 'dark');
            
            // Determine resolved theme
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
            
            // Listen for system theme changes
            const handler = (e: MediaQueryListEvent) => {
                setResolvedTheme(e.matches ? 'dark' : 'light');
            };
            
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            // Apply manual theme
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
            setResolvedTheme(theme);
        }
    }, [theme]);

    const updateTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme: updateTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}