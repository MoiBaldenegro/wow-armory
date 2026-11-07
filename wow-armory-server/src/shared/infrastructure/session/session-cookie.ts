import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { SameSite } from '../../../config/env.validation';

export const DEFAULT_SESSION_TTL_MS = 86_400_000;

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: SameSite;
  domain?: string;
  path: '/';
  maxAge: number;
}

/**
 * Single source of truth for the session cookie attributes. Used by the
 * `express-session` middleware and by logout so the cookie is cleared with
 * exactly the same attributes it was emitted with.
 */
export function buildSessionCookieOptions(
  config: ConfigService,
): SessionCookieOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const domain = config.get<string>('COOKIE_DOMAIN') || undefined;

  return {
    httpOnly: true,
    secure: config.get<boolean>('COOKIE_SECURE', isProduction),
    sameSite: config.get<SameSite>('COOKIE_SAME_SITE', 'lax'),
    ...(domain ? { domain } : {}),
    path: '/',
    maxAge: config.get<number>('SESSION_TTL_MS', DEFAULT_SESSION_TTL_MS),
  };
}

/**
 * Options for `res.clearCookie`: the same attributes without `maxAge`, which
 * Express 4 would otherwise use to re-emit a live cookie.
 */
export function buildClearSessionCookieOptions(
  config: ConfigService,
): CookieOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, ...options } = buildSessionCookieOptions(config);
  return options;
}
