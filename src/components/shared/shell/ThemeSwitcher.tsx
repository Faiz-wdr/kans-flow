'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeSwitcherProps {
  role?: string;
}

export function ThemeSwitcher({ role }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const themeKey = role ? `theme-${role}` : 'theme-default';

  useEffect(() => {
    let savedTheme: 'light' | 'dark' | null = null;
    try {
      savedTheme = localStorage.getItem(themeKey) as 'light' | 'dark' | null;
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    const activeTheme = savedTheme || 'light'; // Default to light theme for clean operations
    
    setTheme(activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeKey]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem(themeKey, nextTheme);
    } catch (e) {
      console.warn('localStorage is not available to write:', e);
    }
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-muted-foreground hover:text-foreground h-8 w-8 transition-colors rounded-lg"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {theme === 'light' ? (
        <Moon className="h-[18px] w-[18px]" />
      ) : (
        <Sun className="h-[18px] w-[18px]" />
      )}
    </Button>
  );
}
