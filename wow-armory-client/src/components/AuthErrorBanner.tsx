import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Has cancelado el inicio de sesión de Battle.net. Puedes intentarlo de nuevo.',
  invalid_state:
    'La solicitud de inicio de sesión ha caducado. Inténtalo de nuevo.',
  auth_failed:
    'No se pudo completar el inicio de sesión con Battle.net. Inténtalo de nuevo.',
};

const GENERIC_AUTH_ERROR =
  'No se pudo completar la autenticación. Inténtalo de nuevo.';

function readAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('auth_error');

  if (!code) {
    return null;
  }

  params.delete('auth_error');

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${
    window.location.hash
  }`;

  window.history.replaceState({}, '', nextUrl);

  return AUTH_ERROR_MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}

export function AuthErrorBanner() {
  const { error } = useAuth();
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const authError = readAuthError();

    if (authError) {
      setUrlError(authError);
    }
  }, []);

  const message = urlError ?? error;

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </div>
  );
}
