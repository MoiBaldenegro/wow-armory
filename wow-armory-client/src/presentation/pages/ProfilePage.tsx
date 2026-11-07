import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { isAuthenticated, isLoading, error, user, login, logout } = useAuth();
  const [hasCheckedSession, setHasCheckedSession] = useState(!isLoading);

  // Only the initial session check replaces the content; later login/logout
  // actions keep the button mounted (disabled) so keyboard focus is not lost.
  if (!isLoading && !hasCheckedSession) {
    setHasCheckedSession(true);
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-16 text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-3xl rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]">
        <h1 className="text-3xl font-black">Mi perfil</h1>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {!hasCheckedSession ? (
          <p
            role="status"
            className="mt-6 text-gray-600 dark:text-gray-300"
          >
            Cargando perfil…
          </p>
        ) : isAuthenticated ? (
          <div className="mt-6 space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-200">
              Sesión iniciada como{' '}
              <strong>{user?.battletag ?? 'jugador de Battle.net'}</strong>.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isLoading}
              aria-busy={isLoading}
              className="rounded-lg border-2 border-black bg-gray-900 px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-white dark:bg-white dark:text-gray-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)] dark:hover:bg-gray-200 dark:focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-200">
              Inicia sesión con Battle.net para ver tu perfil.
            </p>
            <button
              type="button"
              onClick={() => void login()}
              disabled={isLoading}
              aria-busy={isLoading}
              className="rounded-lg border-2 border-black bg-gray-900 px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-white dark:bg-white dark:text-gray-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)] dark:hover:bg-gray-200 dark:focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </div>
        )}

        <Link
          to="/"
          className="mt-8 inline-block font-bold text-gray-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:text-gray-200 dark:focus-visible:ring-white"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
