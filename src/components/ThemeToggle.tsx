import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

type Theme = 'dark' | 'light';

interface ThemeToggleProps {
  collapsed?: boolean;
}

const THEME_KEY = 'compliance-dashboard-theme';

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored) return stored;
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const iconVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 }
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-3 w-full px-3 py-2.5
        text-sm transition-all duration-200 cursor-pointer
        text-steel-400 hover:text-steel-200
        dark:hover:bg-steel-800/50 light:hover:bg-slate-200/50
        hover:bg-steel-800/50
        ${collapsed ? 'justify-center' : ''}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ? (
            <motion.div
              key="moon"
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute"
            >
              <Moon className="w-5 h-5 text-accent-400" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute"
            >
              <Sun className="w-5 h-5 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-steel-400 dark:text-steel-400 light:text-slate-600"
        >
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </motion.span>
      )}

      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-steel-200 bg-midnight-800 dark:bg-midnight-800 light:bg-white light:text-slate-700 border border-steel-700 dark:border-steel-700 light:border-slate-200 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </div>
      )}
    </motion.button>
  );
}

// Theme context for use throughout the app
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored) return stored;
    }
    return 'dark';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored) setTheme(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return theme;
}

export default ThemeToggle;
