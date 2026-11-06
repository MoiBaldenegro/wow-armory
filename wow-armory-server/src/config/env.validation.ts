import { randomBytes } from 'crypto';

type RawConfig = Record<string, unknown>;
type SameSite = 'lax' | 'strict' | 'none';

const PRODUCTION_REQUIRED = [
  'SESSION_SECRET',
  'BLIZZARD_CLIENT_ID',
  'BLIZZARD_CLIENT_SECRET',
  'BLIZZARD_REDIRECT_URI',
] as const;

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  const normalized = asString(value);

  if (normalized === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(normalized.toLowerCase());
}

function asSameSite(value: unknown): SameSite {
  const normalized = asString(value)?.toLowerCase();

  if (
    normalized === 'strict' ||
    normalized === 'none' ||
    normalized === 'lax'
  ) {
    return normalized;
  }

  return 'lax';
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

/**
 * Fail-fast configuration validated by `@nestjs/config`.
 *
 * Production startup requires SESSION_SECRET and the Battle.net credentials.
 * Outside production an ephemeral session secret is generated so local
 * development and tests keep working without committing secrets.
 */
export function validateEnv(config: RawConfig): RawConfig {
  const nodeEnv = asString(config.NODE_ENV) ?? 'development';
  const isProduction = nodeEnv === 'production';
  const errors: string[] = [];

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED) {
      if (!asString(config[key])) {
        errors.push(`${key} is required when NODE_ENV=production`);
      }
    }
  }

  let sessionSecret = asString(config.SESSION_SECRET);

  if (!sessionSecret) {
    sessionSecret = randomBytes(32).toString('hex');
    if (!isProduction) {
      console.warn(
        '[config] SESSION_SECRET is not set; generated an ephemeral development secret. Sessions will be invalidated on restart.',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    SESSION_SECRET: sessionSecret,
    BLIZZARD_CLIENT_ID: asString(config.BLIZZARD_CLIENT_ID) ?? '',
    BLIZZARD_CLIENT_SECRET: asString(config.BLIZZARD_CLIENT_SECRET) ?? '',
    BLIZZARD_REDIRECT_URI: asString(config.BLIZZARD_REDIRECT_URI) ?? '',
    BLIZZARD_REGION: asString(config.BLIZZARD_REGION) ?? 'us',
    BLIZZARD_NAMESPACE:
      asString(config.BLIZZARD_NAMESPACE) ?? 'profile-classic-us',
    CLIENT_URL: asString(config.CLIENT_URL) ?? 'http://localhost:5173',
    CORS_ORIGINS: asString(config.CORS_ORIGINS) ?? 'http://localhost:5173',
    COOKIE_SECURE: asBoolean(config.COOKIE_SECURE, isProduction),
    COOKIE_SAME_SITE: asSameSite(config.COOKIE_SAME_SITE),
    COOKIE_DOMAIN: asString(config.COOKIE_DOMAIN),
    PORT: asPositiveNumber(config.PORT, 3000),
    TOKEN_REFRESH_MARGIN_MS: asPositiveNumber(
      config.TOKEN_REFRESH_MARGIN_MS,
      60_000,
    ),
  };
}
