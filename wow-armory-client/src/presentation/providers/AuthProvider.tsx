import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useUseCases } from '../hooks/useUseCases';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
  onRedirect?: (url: string) => void;
}

const defaultRedirect = (url: string): void => {
  window.location.assign(url);
};

export function AuthProvider({
  children,
  onRedirect = defaultRedirect,
}: AuthProviderProps) {
  const { checkSession, startLogin, logout } = useUseCases();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | undefined>(undefined);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkCurrentSession = useCallback(async () => {
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const session = await checkSession.execute();

      if (!isMounted.current) {
        return;
      }

      setIsAuthenticated(session.authenticated);
      setUser(session.user);
    } catch {
      if (!isMounted.current) {
        return;
      }

      setIsAuthenticated(false);
      setUser(undefined);
      setError('No se pudo verificar la sesión.');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [checkSession]);

  useEffect(() => {
    void checkCurrentSession();
  }, [checkCurrentSession]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // Returning from Battle.net through the bfcache can restore a component
      // that was left in its loading state.
      if (event.persisted) {
        if (isMounted.current) {
          setIsLoading(false);
        }

        void checkCurrentSession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [checkCurrentSession]);

  const login = useCallback(async () => {
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const url = await startLogin.execute();

      if (!isMounted.current) {
        return;
      }

      onRedirect(url);
    } catch {
      if (!isMounted.current) {
        return;
      }

      setIsLoading(false);
      setError('No se pudo iniciar sesión con Battle.net.');
    }
  }, [onRedirect, startLogin]);

  const logoutUser = useCallback(async () => {
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      await logout.execute();

      if (!isMounted.current) {
        return;
      }

      setIsAuthenticated(false);
      setUser(undefined);
    } catch {
      if (!isMounted.current) {
        return;
      }

      setError('No se pudo cerrar la sesión.');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      error,
      user,
      login,
      logout: logoutUser,
    }),
    [error, isAuthenticated, isLoading, login, logoutUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
