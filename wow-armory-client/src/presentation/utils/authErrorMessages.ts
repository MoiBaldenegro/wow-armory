export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Has cancelado el inicio de sesión de Battle.net. Puedes intentarlo de nuevo.',
  invalid_state:
    'La solicitud de inicio de sesión ha caducado. Inténtalo de nuevo.',
  auth_failed:
    'No se pudo completar el inicio de sesión con Battle.net. Inténtalo de nuevo.',
};

export const GENERIC_AUTH_ERROR =
  'No se pudo completar la autenticación. Inténtalo de nuevo.';

export function resolveAuthErrorMessage(code: string | null): string {
  if (!code) {
    return GENERIC_AUTH_ERROR;
  }

  return AUTH_ERROR_MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}
