import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed top-24 right-4 z-50 p-3 rounded-xl bg-black dark:bg-white hover:scale-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {isDark ? (
        <Sun className="w-6 h-6 text-black" aria-hidden="true" />
      ) : (
        <Moon className="w-6 h-6 text-white" aria-hidden="true" />
      )}
    </button>
  );
}
