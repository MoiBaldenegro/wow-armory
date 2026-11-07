import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeContext, type Theme } from './theme-context';

const THEME_STORAGE_KEY = 'wow-armory-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

function getStoredTheme(): Theme | undefined {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : undefined;
  } catch {
    return undefined;
  }
}

function getPreferredTheme(): Theme {
  const stored = getStoredTheme();

  if (stored) {
    return stored;
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable in private mode; the theme still applies.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
