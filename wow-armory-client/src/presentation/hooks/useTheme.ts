import { useContext } from 'react';
import {
  ThemeContext,
  type ThemeContextValue,
} from '../providers/theme-context';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider.');
  }

  return context;
}
