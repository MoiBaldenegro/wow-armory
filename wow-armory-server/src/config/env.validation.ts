import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

type RawConfig = Record<string, unknown>;

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export const SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;
export const BLIZZARD_REGIONS = ['us', 'eu', 'kr', 'tw'] as const;
export const SESSION_STORES = ['memory', 'redis'] as const;
export const LOG_LEVELS = ['error', 'warn', 'log', 'debug', 'verbose'] as const;
export const LOG_FORMATS = ['json', 'pretty'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];
export type SameSite = (typeof SAME_SITE_VALUES)[number];
export type SessionStoreType = (typeof SESSION_STORES)[number];
export type LogLevelName = (typeof LOG_LEVELS)[number];
export type LogFormat = (typeof LOG_FORMATS)[number];
export type TrustProxy = boolean | number;

const PRODUCTION_REQUIRED = [
  'SESSION_SECRET',
  'BLIZZARD_CLIENT_ID',
  'BLIZZARD_CLIENT_SECRET',
  'BLIZZARD_REDIRECT_URI',
  'CLIENT_URL',
] as const;

const POSITIVE_INTEGER_DEFAULTS = {
  SESSION_TTL_MS: 86_400_000,
  TOKEN_REFRESH_MARGIN_MS: 60_000,
  RATE_LIMIT_TTL_MS: 60_000,
  RATE_LIMIT_AUTH_LIMIT: 10,
  RATE_LIMIT_PUBLIC_LIMIT: 60,
} as const;

type PositiveIntegerKey = keyof typeof POSITIVE_INTEGER_DEFAULTS;

const MIN_SESSION_SECRET_LENGTH = 32;
const DEFAULT_CLIENT_URL = 'http://localhost:5173';
const TRUE_VALUES = ['true', '1', 'yes', 'on'];
const FALSE_VALUES = ['false', '0', 'no', 'off'];

const logger = new Logger('Config');

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function oneOf<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return value !== undefined && (values as readonly string[]).includes(value);
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isHttpUrl(url: URL | undefined, httpsOnly: boolean): boolean {
  if (!url) {
    return false;
  }

  return httpsOnly
    ? url.protocol === 'https:'
    : url.protocol === 'https:' || url.protocol === 'http:';
}

function parseInteger(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : NaN;
}

/**
 * Normalizes a CORS origin (`scheme://host[:port]`). Returns `undefined` when
 * the entry has a path, query, credentials, a wildcard or a non-http scheme.
 */
export function normalizeOrigin(value: string): string | undefined {
  if (value.includes('*')) {
    return undefined;
  }

  const url = parseUrl(value);

  if (
    !url ||
    !isHttpUrl(url, false) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    value.replace(/\/$/, '').toLowerCase() !== url.origin.toLowerCase()
  ) {
    return undefined;
  }

  return url.origin;
}

export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Replaces the credentials of a redis URL so it can be logged safely. */
export function maskRedisUrl(value: string): string {
  const url = parseUrl(value);

  if (!url) {
    return '[invalid REDIS_URL]';
  }

  if (url.password) {
    url.password = '****';
  }

  return url.toString();
}

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), {
      encoding: 'utf8',
    });
    const parsed = JSON.parse(raw) as { version?: unknown };

    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Fail-fast configuration validated by `@nestjs/config`.
 *
 * Every problem is collected and reported in a single error that names the
 * affected variables without echoing their values. Outside production an
 * ephemeral session secret is generated so local development and tests keep
 * working without committing secrets.
 */
export function validateEnv(config: RawConfig): RawConfig {
  const errors: string[] = [];

  // NODE_ENV
  const rawNodeEnv = asString(config.NODE_ENV) ?? 'development';
  const nodeEnv: NodeEnv = oneOf(NODE_ENVS, rawNodeEnv)
    ? rawNodeEnv
    : 'development';
  if (!oneOf(NODE_ENVS, rawNodeEnv)) {
    errors.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED) {
      if (!asString(config[key])) {
        errors.push(`${key} is required when NODE_ENV=production`);
      }
    }
  }

  // PORT
  const rawPort = asString(config.PORT);
  let port = 3000;
  if (rawPort !== undefined) {
    const parsed = parseInteger(rawPort);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      errors.push('PORT must be an integer between 1 and 65535');
    } else {
      port = parsed;
    }
  }

  // SESSION_SECRET
  let sessionSecret = asString(config.SESSION_SECRET);
  if (!sessionSecret && !isProduction) {
    sessionSecret = randomBytes(32).toString('hex');
    logger.warn(
      'SESSION_SECRET is not set; generated an ephemeral development secret. Sessions will be invalidated on restart.',
    );
  }
  if (
    isProduction &&
    sessionSecret &&
    sessionSecret.length < MIN_SESSION_SECRET_LENGTH
  ) {
    errors.push(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters when NODE_ENV=production`,
    );
  }

  // Positive integers
  const integers = { ...POSITIVE_INTEGER_DEFAULTS } as Record<
    PositiveIntegerKey,
    number
  >;
  for (const key of Object.keys(
    POSITIVE_INTEGER_DEFAULTS,
  ) as PositiveIntegerKey[]) {
    const raw = asString(config[key]);
    if (raw === undefined) {
      continue;
    }
    const parsed = parseInteger(raw);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      errors.push(`${key} must be a positive integer`);
    } else {
      integers[key] = parsed;
    }
  }

  // Cookies
  const rawCookieSecure = asString(config.COOKIE_SECURE)?.toLowerCase();
  let cookieSecure = isProduction;
  if (rawCookieSecure !== undefined) {
    if (TRUE_VALUES.includes(rawCookieSecure)) {
      cookieSecure = true;
    } else if (FALSE_VALUES.includes(rawCookieSecure)) {
      cookieSecure = false;
    } else {
      errors.push('COOKIE_SECURE must be true or false');
    }
  }
  if (isProduction && !cookieSecure) {
    errors.push('COOKIE_SECURE must be true when NODE_ENV=production');
  }

  const rawSameSite = asString(config.COOKIE_SAME_SITE)?.toLowerCase() ?? 'lax';
  let cookieSameSite: SameSite = 'lax';
  if (oneOf(SAME_SITE_VALUES, rawSameSite)) {
    cookieSameSite = rawSameSite;
  } else {
    errors.push(
      `COOKIE_SAME_SITE must be one of ${SAME_SITE_VALUES.join(', ')}`,
    );
  }
  if (cookieSameSite === 'none' && !cookieSecure) {
    errors.push('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
  }

  // Blizzard
  const blizzardRegion =
    asString(config.BLIZZARD_REGION)?.toLowerCase() ?? 'us';
  if (!oneOf(BLIZZARD_REGIONS, blizzardRegion)) {
    errors.push(
      `BLIZZARD_REGION must be one of ${BLIZZARD_REGIONS.join(', ')}`,
    );
  }

  const redirectUri = asString(config.BLIZZARD_REDIRECT_URI);
  if (redirectUri && !isHttpUrl(parseUrl(redirectUri), isProduction)) {
    errors.push(
      isProduction
        ? 'BLIZZARD_REDIRECT_URI must be an absolute https:// URL when NODE_ENV=production'
        : 'BLIZZARD_REDIRECT_URI must be an absolute http(s) URL',
    );
  }

  // CLIENT_URL and CORS_ORIGINS
  const clientUrl =
    asString(config.CLIENT_URL) ?? (isProduction ? '' : DEFAULT_CLIENT_URL);
  let clientOrigin: string | undefined;
  if (clientUrl) {
    const parsedClientUrl = parseUrl(clientUrl);
    if (!isHttpUrl(parsedClientUrl, isProduction)) {
      errors.push(
        isProduction
          ? 'CLIENT_URL must be an absolute https:// URL when NODE_ENV=production'
          : 'CLIENT_URL must be an absolute http(s) URL',
      );
    } else {
      clientOrigin = parsedClientUrl?.origin;
    }
  }

  const rawCorsOrigins = asString(config.CORS_ORIGINS);
  let corsOrigins: string[] = clientOrigin ? [clientOrigin] : [];
  if (rawCorsOrigins !== undefined) {
    const normalized = parseOrigins(rawCorsOrigins).map(normalizeOrigin);

    if (normalized.length === 0 || normalized.some((entry) => !entry)) {
      errors.push(
        'CORS_ORIGINS must be a comma-separated list of origins (scheme://host[:port], without path or *)',
      );
    } else if (
      isProduction &&
      normalized.some((entry) => !entry?.startsWith('https://'))
    ) {
      errors.push(
        'CORS_ORIGINS entries must use https:// when NODE_ENV=production',
      );
    }

    corsOrigins = normalized.filter((entry): entry is string => !!entry);
  }
  if (isProduction && clientOrigin && !corsOrigins.includes(clientOrigin)) {
    errors.push('CORS_ORIGINS must include the origin of CLIENT_URL');
  }

  // TRUST_PROXY
  const rawTrustProxy = asString(config.TRUST_PROXY)?.toLowerCase();
  let trustProxy: TrustProxy = isProduction ? 1 : false;
  if (rawTrustProxy !== undefined) {
    if (rawTrustProxy === 'true') {
      trustProxy = true;
    } else if (rawTrustProxy === 'false') {
      trustProxy = false;
    } else if (Number.isSafeInteger(parseInteger(rawTrustProxy))) {
      trustProxy = parseInteger(rawTrustProxy);
    } else {
      errors.push(
        'TRUST_PROXY must be true, false or a non-negative integer number of hops',
      );
    }
  }

  // SESSION_STORE and REDIS_URL
  const redisUrl = asString(config.REDIS_URL);
  const rawSessionStore = asString(config.SESSION_STORE)?.toLowerCase();
  let sessionStore: SessionStoreType = redisUrl ? 'redis' : 'memory';
  if (rawSessionStore !== undefined) {
    if (oneOf(SESSION_STORES, rawSessionStore)) {
      sessionStore = rawSessionStore;
    } else {
      errors.push(`SESSION_STORE must be one of ${SESSION_STORES.join(', ')}`);
    }
  }
  if (isProduction && !redisUrl && rawSessionStore !== 'memory') {
    errors.push(
      'REDIS_URL is required when NODE_ENV=production unless SESSION_STORE=memory is set explicitly',
    );
  } else if (sessionStore === 'redis' && !redisUrl) {
    errors.push('REDIS_URL is required when SESSION_STORE=redis');
  }
  if (sessionStore === 'redis' && redisUrl) {
    const protocol = parseUrl(redisUrl)?.protocol;
    if (protocol !== 'redis:' && protocol !== 'rediss:') {
      errors.push('REDIS_URL must use the redis:// or rediss:// scheme');
    }
  }

  // Logging
  const logLevel = asString(config.LOG_LEVEL)?.toLowerCase() ?? 'log';
  if (!oneOf(LOG_LEVELS, logLevel)) {
    errors.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}`);
  }
  const logFormat =
    asString(config.LOG_FORMAT)?.toLowerCase() ??
    (isProduction ? 'json' : 'pretty');
  if (!oneOf(LOG_FORMATS, logFormat)) {
    errors.push(`LOG_FORMAT must be one of ${LOG_FORMATS.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    SESSION_SECRET: sessionSecret,
    SESSION_STORE: sessionStore,
    REDIS_URL: redisUrl,
    SESSION_TTL_MS: integers.SESSION_TTL_MS,
    BLIZZARD_CLIENT_ID: asString(config.BLIZZARD_CLIENT_ID) ?? '',
    BLIZZARD_CLIENT_SECRET: asString(config.BLIZZARD_CLIENT_SECRET) ?? '',
    BLIZZARD_REDIRECT_URI: redirectUri ?? '',
    BLIZZARD_REGION: blizzardRegion,
    BLIZZARD_NAMESPACE:
      asString(config.BLIZZARD_NAMESPACE) ??
      `profile-classic-${blizzardRegion}`,
    CLIENT_URL: clientUrl,
    CORS_ORIGINS: corsOrigins.join(','),
    COOKIE_SECURE: cookieSecure,
    COOKIE_SAME_SITE: cookieSameSite,
    COOKIE_DOMAIN: asString(config.COOKIE_DOMAIN),
    TRUST_PROXY: trustProxy,
    TOKEN_REFRESH_MARGIN_MS: integers.TOKEN_REFRESH_MARGIN_MS,
    LOG_LEVEL: logLevel,
    LOG_FORMAT: logFormat,
    RATE_LIMIT_TTL_MS: integers.RATE_LIMIT_TTL_MS,
    RATE_LIMIT_AUTH_LIMIT: integers.RATE_LIMIT_AUTH_LIMIT,
    RATE_LIMIT_PUBLIC_LIMIT: integers.RATE_LIMIT_PUBLIC_LIMIT,
    APP_VERSION: asString(config.APP_VERSION) ?? readPackageVersion(),
  };
}
