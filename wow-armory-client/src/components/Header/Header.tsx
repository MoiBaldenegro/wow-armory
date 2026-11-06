import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
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

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    // Implement search logic here
  };

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
    <motion.header
      style={{
        background: headerBackground,
        padding: headerPadding,
      }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-8">
          <Logo isCompact={isCompact} />
          <SearchBar isCompact={isCompact} onSearch={handleSearch} />
          <button
            type="button"
            onClick={handleAuthAction}
            disabled={isBusy}
            aria-busy={isBusy}
            title={user?.battletag}
            className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLabel}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
