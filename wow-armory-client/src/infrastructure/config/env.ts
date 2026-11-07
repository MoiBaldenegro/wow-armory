export const DEFAULT_SERVER_URI = 'http://localhost:3000';

export interface EnvInput {
  serverUri?: string;
  isProduction: boolean;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Resolves the API base URL from the environment.
 *
 * - Production (`import.meta.env.PROD`) requires a valid http(s) URL.
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

  if (!isHttpUrl(value)) {
    if (isProduction) {
      throw new Error(
        `VITE_SERVER_URI must be a valid http(s) URL. Received "${value}".`,
      );
    }

    return DEFAULT_SERVER_URI;
  }

  return stripTrailingSlashes(value);
}

export function getServerUri(): string {
  return resolveServerUri({
    serverUri: import.meta.env.VITE_SERVER_URI as string | undefined,
    isProduction: Boolean(import.meta.env.PROD),
  });
}
