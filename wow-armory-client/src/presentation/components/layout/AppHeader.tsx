import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../ui/Icon';
import { Brand } from './Brand';
import { QuickSearch } from './QuickSearch';

interface AppHeaderProps {
  showAuthAction?: boolean;
}

const MENU_ID = 'app-menu';

export function AppHeader({ showAuthAction = true }: AppHeaderProps) {
  const [isActionPending, setIsActionPending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const location = useLocation();

  // The mobile menu closes after every navigation.
  useEffect(() => setIsMenuOpen(false), [location.pathname]);

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
    <header className="mx-navbar" data-menu={isMenuOpen ? 'open' : 'closed'}>
      <div className="mx-navbar__inner">
        <Brand />
        <button
          type="button"
          className="mx-icon-button mx-navbar__toggle"
          aria-controls={MENU_ID}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setIsMenuOpen((open) => !open)}
        />
        <div className="mx-navbar__menu" id={MENU_ID}>
          <nav className="mx-nav-links" aria-label="Navegación principal">
            <NavLink className="mx-nav-link" to="/" end>
              Inicio
            </NavLink>
            <NavLink className="mx-nav-link" to="/guide">
              Guía
            </NavLink>
            <NavLink className="mx-nav-link" to="/leaderboards">
              Arena
            </NavLink>
            {isAuthenticated && (
              <NavLink className="mx-nav-link" to="/profile">
                Mi perfil
              </NavLink>
            )}
          </nav>
          <QuickSearch isCompact={false} />
          {showAuthAction && (
            <button
              type="button"
              onClick={handleAuthAction}
              disabled={isBusy}
              aria-busy={isBusy}
              title={user?.battletag ?? user?.accountId}
              className="mx-button mx-button--sm header-auth"
            >
              <Icon
                className={isBusy ? 'spin' : undefined}
                name={isBusy ? 'loader' : isAuthenticated ? 'logout' : 'login'}
                size={15}
              />
              {authLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
