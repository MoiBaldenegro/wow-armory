import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="icon-button"
      aria-label={label}
      title={label}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={19} />
    </button>
  );
}
