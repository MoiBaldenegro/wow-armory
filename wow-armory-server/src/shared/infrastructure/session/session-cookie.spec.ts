import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as request from 'supertest';
import {
  buildClearSessionCookieOptions,
  buildSessionCookieOptions,
} from './session-cookie';

function fakeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

describe('session cookie options', () => {
  it('builds every attribute from the configuration', () => {
    const config = fakeConfig({
      NODE_ENV: 'production',
      COOKIE_SECURE: true,
      COOKIE_SAME_SITE: 'none',
      COOKIE_DOMAIN: '.example.com',
      SESSION_TTL_MS: 3_600_000,
    });

    expect(buildSessionCookieOptions(config)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.example.com',
      path: '/',
      maxAge: 3_600_000,
    });
  });

  it('applies safe defaults and omits an empty domain', () => {
    const config = fakeConfig({ NODE_ENV: 'development' });

    expect(buildSessionCookieOptions(config)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 86_400_000,
    });
  });

  it('defaults secure to true in production', () => {
    const config = fakeConfig({ NODE_ENV: 'production' });

    expect(buildSessionCookieOptions(config).secure).toBe(true);
  });

  it('clear options keep the same attributes without maxAge', () => {
    const config = fakeConfig({
      COOKIE_SECURE: true,
      COOKIE_SAME_SITE: 'none',
      COOKIE_DOMAIN: '.example.com',
    });

    expect(buildClearSessionCookieOptions(config)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.example.com',
      path: '/',
    });
  });

  it('emits SameSite=None; Secure; HttpOnly and clears with the same attributes', async () => {
    const config = fakeConfig({
      COOKIE_SECURE: true,
      COOKIE_SAME_SITE: 'none',
    });
    const app = express();
    app.get('/set', (_req, res) => {
      res.cookie('wow_session', 'value', buildSessionCookieOptions(config));
      res.end();
    });
    app.get('/clear', (_req, res) => {
      res.clearCookie('wow_session', buildClearSessionCookieOptions(config));
      res.end();
    });

    const set = await request(app).get('/set');
    const setCookie = String(set.headers['set-cookie']);
    expect(setCookie).toContain('SameSite=None');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Max-Age=86400');

    const clear = await request(app).get('/clear');
    const clearCookie = String(clear.headers['set-cookie']);
    expect(clearCookie).toContain('SameSite=None');
    expect(clearCookie).toContain('Secure');
    expect(clearCookie).toContain('HttpOnly');
    expect(clearCookie).toContain('Expires=Thu, 01 Jan 1970');
    expect(clearCookie).not.toContain('Max-Age');
  });
});
