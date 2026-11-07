export const DEFAULT_SERVER_URI = 'http://localhost:3000';

export interface EnvInput {
  serverUri?: string;
  isProduction: boolean;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Resolves the API base URL from the environment.
 *
 * - Production (`import.meta.env.PROD`) requires a valid https URL; plain
 *   http is only accepted for loopback hosts (`localhost`, `127.0.0.1`).
 * - Development and tests fall back to the local server.
 */
export function resolveServerUri({ serverUri, isProduction }: EnvInput): string {
  const value = serverUri?.trim();

  if (!value) {
    if (isProduction) {
      throw new Error(
        'VITE_SERVER_URI is required in production. Set it to the API base URL.',
      );
    }

    return DEFAULT_SERVER_URI;
  }

  const url = parseHttpUrl(value);

  if (!url) {
    if (isProduction) {
      throw new Error(
        `VITE_SERVER_URI must be a valid http(s) URL. Received "${value}".`,
      );
    }

    return DEFAULT_SERVER_URI;
  }

  if (
    isProduction &&
    url.protocol === 'http:' &&
    !LOOPBACK_HOSTS.has(url.hostname)
  ) {
    throw new Error(
      `VITE_SERVER_URI must use https:// in production (http:// is only allowed for localhost or 127.0.0.1). Received "${value}".`,
    );
  }

  return stripTrailingSlashes(value);
}

export function getServerUri(): string {
  return resolveServerUri({
    serverUri: import.meta.env.VITE_SERVER_URI as string | undefined,
    isProduction: Boolean(import.meta.env.PROD),
  });
}
