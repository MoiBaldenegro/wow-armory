import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  showAuthAction?: boolean;
}

export function Header({ showAuthAction = true }: HeaderProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const { scrollY } = useScroll();
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();

  const headerBackground = useTransform(
    scrollY,
    [0, 50],
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)']
  );

  const headerPadding = useTransform(
    scrollY,
    [0, 50],
    ['1.5rem', '0.75rem']
  );

  useEffect(() => {
    const updateCompactState = () => {
      setIsCompact(window.scrollY > 50);
    };

    window.addEventListener('scroll', updateCompactState);
    return () => window.removeEventListener('scroll', updateCompactState);
  }, []);

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
  const authAriaLabel = isBusy
    ? 'Cargando…'
    : isAuthenticated
      ? user?.battletag
        ? `Cerrar sesión de ${user.battletag}`
        : 'Cerrar sesión'
      : 'Iniciar sesión';
  const AuthIcon = isBusy ? Loader2 : isAuthenticated ? LogOut : LogIn;

  return (
    <motion.header
      style={{
        background: headerBackground,
        padding: headerPadding,
      }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 sm:gap-6">
          <Logo isCompact={isCompact} />
          <div className="min-w-0 flex-1">
            <SearchBar isCompact={isCompact} />
          </div>
          {showAuthAction && (
            <button
            type="button"
            onClick={handleAuthAction}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-label={authAriaLabel}
            title={user?.battletag ?? user?.accountId}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/30 bg-gray-900/90 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <AuthIcon
              className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{authLabel}</span>
            </button>
          )}
          {isAuthenticated && (
            <Link
              to="/profile"
              className="hidden rounded-lg border border-amber-300/50 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:inline-flex"
            >
              Mi perfil
            </Link>
          )}
          <Link
            to="/guide"
            className="hidden text-sm font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:inline-flex"
          >
            Guía
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
