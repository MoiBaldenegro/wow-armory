import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { ThemeProvider } from './ThemeProvider';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeProvider', () => {
  it('initializes from localStorage and applies the dark class', () => {
    window.localStorage.setItem('wow-armory-theme', 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to prefers-color-scheme when there is no stored choice', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('wow-armory-theme')).toBeNull();
  });

  it('toggles the theme, updates the class and persists the choice', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.isDark).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('wow-armory-theme')).toBe('dark');
  });

  it('keeps the toggle label in Spanish and reflecting the action', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', {
      name: 'Cambiar a tema oscuro',
    });

    act(() => {
      button.click();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Cambiar a tema claro' }),
      ).toBeInTheDocument();
    });
  });

  it('throws a clear error when useTheme is used outside the provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used inside a ThemeProvider/,
    );

    consoleError.mockRestore();
  });
});
