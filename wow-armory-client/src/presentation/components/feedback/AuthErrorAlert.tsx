import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { resolveAuthErrorMessage } from '../../utils/authErrorMessages';
import { ErrorAlert } from '../ui/ErrorAlert';

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

  return resolveAuthErrorMessage(code);
}

export function AuthErrorAlert() {
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

  return <ErrorAlert className="auth-banner">{message}</ErrorAlert>;
}
