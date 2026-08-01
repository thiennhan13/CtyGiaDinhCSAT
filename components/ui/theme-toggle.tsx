'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Tránh hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Placeholder cùng kích thước, không render icon thật
    return (
      <div className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5 w-8 h-8 opacity-0',
        className
      )} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Chuyển sang Sáng' : 'Chuyển sang Tối'}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5',
        'text-muted-foreground hover:text-foreground hover:bg-secondary',
        'transition-colors duration-150 cursor-pointer',
        className
      )}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}

