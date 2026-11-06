import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from './auth-context';

const SERVER_URI =
  (import.meta.env.VITE_SERVER_URI as string | undefined) ??
  'http://localhost:3000';

interface SessionResponse {
  authenticated: boolean;
  user?: AuthUser;
}

interface LoginResponse {
  url: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | undefined>(undefined);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<SessionResponse>(
        `${SERVER_URI}/auth/session`,
        { withCredentials: true },
      );
      setIsAuthenticated(Boolean(response.data.authenticated));
      setUser(response.data.user);
    } catch {
      setIsAuthenticated(false);
      setUser(undefined);
      setError('No se pudo verificar la sesión.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<LoginResponse>(
        `${SERVER_URI}/auth/login`,
        { withCredentials: true },
      );

      if (!response.data.url) {
        throw new Error('Missing authorization URL');
      }

      window.location.assign(response.data.url);
    } catch {
      setIsLoading(false);
      setError('No se pudo iniciar sesión con Battle.net.');
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await axios.post(`${SERVER_URI}/auth/logout`, null, {
        withCredentials: true,
      });
      setIsAuthenticated(false);
      setUser(undefined);
    } catch {
      setError('No se pudo cerrar la sesión.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      error,
      user,
      login,
      logout,
    }),
    [error, isAuthenticated, isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
