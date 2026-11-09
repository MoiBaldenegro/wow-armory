import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../ui/Icon';
import { Brand } from './Brand';
import { QuickSearch } from './QuickSearch';
import { ThemeToggle } from './ThemeToggle';

interface AppHeaderProps {
  showAuthAction?: boolean;
}

export function AppHeader({ showAuthAction = true }: AppHeaderProps) {
  const [isActionPending, setIsActionPending] = useState(false);
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();

  const handleAuthAction = async () => {
    setIsActionPending(true);

    try {
      if (isAuthenticated) {
        await logout();
      } else {
        await login();
      }
    } finally {
      setIsActionPending(false);
    }
  };

  const isBusy = isActionPending || isLoading;
  const authLabel = isBusy
    ? 'Cargando…'
    : isAuthenticated
      ? 'Cerrar sesión'
      : 'Iniciar sesión';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <div className="header-search">
          <QuickSearch isCompact={false} />
        </div>
        <nav className="header-nav" aria-label="Navegación principal">
          <Link to="/">Inicio</Link>
          <Link to="/guide">Guía</Link>
          {isAuthenticated && <Link to="/profile">Mi perfil</Link>}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {showAuthAction && (
            <button
              type="button"
              onClick={handleAuthAction}
              disabled={isBusy}
              aria-busy={isBusy}
              title={user?.battletag ?? user?.accountId}
              className="btn btn-ghost btn-sm"
            >
              <Icon
                className={isBusy ? 'spin' : undefined}
                name={isBusy ? 'loader' : isAuthenticated ? 'logout' : 'login'}
                size={16}
              />
              {authLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
