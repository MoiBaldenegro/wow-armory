import { Logger } from '@nestjs/common';
import { maskRedisUrl, normalizeOrigin, validateEnv } from './env.validation';

const PROD_SECRET = 's'.repeat(48);
const BLIZZARD_SECRET = 'BLIZZARD-SECRET-SENTINEL';
const REDIS_PASSWORD = 'REDIS-PASSWORD-SENTINEL';

function production(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'production',
    SESSION_SECRET: PROD_SECRET,
    BLIZZARD_CLIENT_ID: 'client-id',
    BLIZZARD_CLIENT_SECRET: BLIZZARD_SECRET,
    BLIZZARD_REDIRECT_URI: 'https://api.example.com/auth/callback',
    CLIENT_URL: 'https://app.example.com',
    CORS_ORIGINS: 'https://app.example.com',
    REDIS_URL: `rediss://default:${REDIS_PASSWORD}@cache.upstash.io:6379`,
    ...overrides,
  };
}

function errorOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }

  throw new Error('expected validateEnv to throw');
}

describe('validateEnv', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  describe('existing production requirements', () => {
    it('fails in production when SESSION_SECRET is missing', () => {
      expect(() =>
        validateEnv(production({ SESSION_SECRET: undefined })),
      ).toThrow(/SESSION_SECRET is required/);
    });

    it('fails in production when Battle.net credentials are missing', () => {
      expect(() =>
        validateEnv(
          production({
            BLIZZARD_CLIENT_ID: undefined,
            BLIZZARD_CLIENT_SECRET: undefined,
          }),
        ),
      ).toThrow(/BLIZZARD_CLIENT_ID.*BLIZZARD_CLIENT_SECRET/);
    });

    it('rejects a SESSION_SECRET shorter than 32 characters in production', () => {
      expect(() =>
        validateEnv(production({ SESSION_SECRET: 'too-short' })),
      ).toThrow(/at least 32 characters/);
    });

    it('rejects sameSite=none when the cookie is not secure', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'development',
          SESSION_SECRET: 'x'.repeat(32),
          COOKIE_SAME_SITE: 'none',
          COOKIE_SECURE: 'false',
        }),
      ).toThrow(/COOKIE_SAME_SITE=none requires COOKIE_SECURE=true/);
    });

    it('accepts sameSite=none when the cookie is secure', () => {
      const config = validateEnv({
        NODE_ENV: 'development',
        SESSION_SECRET: 'x'.repeat(32),
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'true',
      });

      expect(config.COOKIE_SAME_SITE).toBe('none');
      expect(config.COOKIE_SECURE).toBe(true);
    });

    it('accepts a complete production configuration', () => {
      const config = validateEnv(production());

      expect(config).toMatchObject({
        NODE_ENV: 'production',
        COOKIE_SECURE: true,
        TRUST_PROXY: 1,
        SESSION_STORE: 'redis',
        LOG_FORMAT: 'json',
        CORS_ORIGINS: 'https://app.example.com',
      });
    });
  });

  describe('development defaults', () => {
    it('does not throw for an empty config and applies the documented defaults', () => {
      const config = validateEnv({});

      expect(config).toMatchObject({
        NODE_ENV: 'development',
        PORT: 3000,
        SESSION_STORE: 'memory',
        SESSION_TTL_MS: 86_400_000,
        BLIZZARD_CLIENT_ID: '',
        BLIZZARD_CLIENT_SECRET: '',
        BLIZZARD_REDIRECT_URI: '',
        BLIZZARD_REGION: 'us',
        BLIZZARD_NAMESPACE: 'profile-classic-us',
        CLIENT_URL: 'http://localhost:5173',
        CORS_ORIGINS: 'http://localhost:5173',
        COOKIE_SECURE: false,
        COOKIE_SAME_SITE: 'lax',
        TRUST_PROXY: false,
        TOKEN_REFRESH_MARGIN_MS: 60_000,
        LOG_LEVEL: 'log',
        LOG_FORMAT: 'pretty',
        RATE_LIMIT_TTL_MS: 60_000,
        RATE_LIMIT_AUTH_LIMIT: 10,
        RATE_LIMIT_PUBLIC_LIMIT: 60,
      });
      expect(config.COOKIE_DOMAIN).toBeUndefined();
      expect(config.REDIS_URL).toBeUndefined();
      expect(config.APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('generates an ephemeral development secret with a warning through the Nest Logger', () => {
      const config = validateEnv({ NODE_ENV: 'development' });

      expect(typeof config.SESSION_SECRET).toBe('string');
      expect((config.SESSION_SECRET as string).length).toBeGreaterThanOrEqual(
        64,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('ephemeral development secret'),
      );
    });

    it('uses APP_VERSION when defined', () => {
      expect(validateEnv({ APP_VERSION: 'abc123' }).APP_VERSION).toBe('abc123');
    });

    it('defaults CORS_ORIGINS to the origin of CLIENT_URL', () => {
      const config = validateEnv({
        CLIENT_URL: 'http://localhost:4000/app/',
      });

      expect(config.CORS_ORIGINS).toBe('http://localhost:4000');
    });

    it('defaults SESSION_STORE to redis when REDIS_URL is present', () => {
      const config = validateEnv({ REDIS_URL: 'redis://localhost:6379' });

      expect(config.SESSION_STORE).toBe('redis');
    });

    it('parses TRUST_PROXY booleans and hop counts', () => {
      expect(validateEnv({ TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
      expect(validateEnv({ TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(false);
      expect(validateEnv({ TRUST_PROXY: '0' }).TRUST_PROXY).toBe(0);
      expect(validateEnv({ TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
    });
  });

  describe('invalid values fail instead of falling back', () => {
    it.each([
      ['NODE_ENV', 'staging'],
      ['PORT', 'abc'],
      ['PORT', '0'],
      ['PORT', '65536'],
      ['PORT', '3000.5'],
      ['COOKIE_SAME_SITE', 'sometimes'],
      ['BLIZZARD_REGION', 'cn'],
      ['TRUST_PROXY', 'maybe'],
      ['TRUST_PROXY', '-1'],
      ['SESSION_STORE', 'postgres'],
      ['LOG_LEVEL', 'trace'],
      ['LOG_FORMAT', 'xml'],
      ['SESSION_TTL_MS', '0'],
      ['SESSION_TTL_MS', 'one-day'],
      ['TOKEN_REFRESH_MARGIN_MS', '-5'],
      ['RATE_LIMIT_TTL_MS', '1.5'],
      ['RATE_LIMIT_AUTH_LIMIT', '0'],
      ['RATE_LIMIT_PUBLIC_LIMIT', 'lots'],
      ['COOKIE_SECURE', 'perhaps'],
    ])('rejects %s=%s', (key, value) => {
      const message = errorOf(() => validateEnv({ [key]: value }));

      expect(message).toMatch(/^Invalid environment configuration: /);
      expect(message).toContain(key);
    });

    it('reports every problem in a single error', () => {
      const message = errorOf(() =>
        validateEnv({ PORT: 'x', LOG_LEVEL: 'trace', BLIZZARD_REGION: 'cn' }),
      );

      expect(message).toContain('PORT');
      expect(message).toContain('LOG_LEVEL');
      expect(message).toContain('BLIZZARD_REGION');
    });
  });

  describe('CORS_ORIGINS in any environment', () => {
    it.each([
      '*',
      'https://*.example.com',
      'http://localhost:5173/path',
      'localhost:5173',
      'ftp://example.com',
      'http://localhost:5173,not-an-origin',
      'http://localhost:5173?x=1',
    ])('rejects %s', (value) => {
      expect(() => validateEnv({ CORS_ORIGINS: value })).toThrow(
        /CORS_ORIGINS/,
      );
    });

    it('accepts and normalizes a list of origins', () => {
      const config = validateEnv({
        CORS_ORIGINS: 'http://localhost:5173, http://127.0.0.1:5173/',
      });

      expect(config.CORS_ORIGINS).toBe(
        'http://localhost:5173,http://127.0.0.1:5173',
      );
    });

    it('normalizeOrigin keeps scheme, host and port only', () => {
      expect(normalizeOrigin('https://app.example.com:8443')).toBe(
        'https://app.example.com:8443',
      );
      expect(normalizeOrigin('https://user:pw@app.example.com')).toBe(
        undefined,
      );
    });
  });

  describe('REDIS_URL', () => {
    it('is required when SESSION_STORE=redis', () => {
      expect(() => validateEnv({ SESSION_STORE: 'redis' })).toThrow(
        /REDIS_URL is required when SESSION_STORE=redis/,
      );
    });

    it('must use redis:// or rediss://', () => {
      const message = errorOf(() =>
        validateEnv({
          SESSION_STORE: 'redis',
          REDIS_URL: `https://default:${REDIS_PASSWORD}@cache.example.com`,
        }),
      );

      expect(message).toMatch(
        /REDIS_URL must use the redis:\/\/ or rediss:\/\//,
      );
      expect(message).not.toContain(REDIS_PASSWORD);
    });

    it('maskRedisUrl hides the password', () => {
      const masked = maskRedisUrl(
        `rediss://default:${REDIS_PASSWORD}@cache.upstash.io:6379`,
      );

      expect(masked).toBe('rediss://default:****@cache.upstash.io:6379');
    });
  });

  describe('production requirements', () => {
    it('fails when CLIENT_URL is missing', () => {
      expect(() => validateEnv(production({ CLIENT_URL: undefined }))).toThrow(
        /CLIENT_URL is required when NODE_ENV=production/,
      );
    });

    it('fails when CLIENT_URL is not an absolute https URL', () => {
      expect(() =>
        validateEnv(production({ CLIENT_URL: 'http://app.example.com' })),
      ).toThrow(/CLIENT_URL must be an absolute https:\/\/ URL/);
      expect(() =>
        validateEnv(production({ CLIENT_URL: 'app.example.com' })),
      ).toThrow(/CLIENT_URL must be an absolute https:\/\/ URL/);
    });

    it('fails when BLIZZARD_REDIRECT_URI is not an absolute https URL', () => {
      expect(() =>
        validateEnv(
          production({
            BLIZZARD_REDIRECT_URI: 'http://api.example.com/auth/callback',
          }),
        ),
      ).toThrow(/BLIZZARD_REDIRECT_URI must be an absolute https:\/\/ URL/);
    });

    it('fails when COOKIE_SECURE=false', () => {
      expect(() => validateEnv(production({ COOKIE_SECURE: 'false' }))).toThrow(
        /COOKIE_SECURE must be true when NODE_ENV=production/,
      );
    });

    it('fails when a CORS_ORIGINS entry is not https', () => {
      expect(() =>
        validateEnv(
          production({
            CORS_ORIGINS: 'https://app.example.com,http://www.example.com',
          }),
        ),
      ).toThrow(/CORS_ORIGINS entries must use https:\/\//);
    });

    it('fails when a CORS_ORIGINS entry has a path', () => {
      expect(() =>
        validateEnv(
          production({ CORS_ORIGINS: 'https://app.example.com/app' }),
        ),
      ).toThrow(/CORS_ORIGINS must be a comma-separated list of origins/);
    });

    it('fails when the CLIENT_URL origin is not in CORS_ORIGINS', () => {
      expect(() =>
        validateEnv(production({ CORS_ORIGINS: 'https://other.example.com' })),
      ).toThrow(/CORS_ORIGINS must include the origin of CLIENT_URL/);
    });

    it('defaults CORS_ORIGINS to the CLIENT_URL origin in production', () => {
      const config = validateEnv(
        production({
          CLIENT_URL: 'https://app.example.com/home',
          CORS_ORIGINS: undefined,
        }),
      );

      expect(config.CORS_ORIGINS).toBe('https://app.example.com');
    });

    it('fails without REDIS_URL unless SESSION_STORE=memory is explicit', () => {
      expect(() => validateEnv(production({ REDIS_URL: undefined }))).toThrow(
        /REDIS_URL is required when NODE_ENV=production unless SESSION_STORE=memory/,
      );
      expect(() =>
        validateEnv(
          production({ REDIS_URL: undefined, SESSION_STORE: 'redis' }),
        ),
      ).toThrow(/REDIS_URL is required/);
    });

    it('accepts an explicit memory store without REDIS_URL', () => {
      const config = validateEnv(
        production({ REDIS_URL: undefined, SESSION_STORE: 'memory' }),
      );

      expect(config.SESSION_STORE).toBe('memory');
    });

    it('lists every missing variable without echoing secret values', () => {
      const message = errorOf(() =>
        validateEnv({
          NODE_ENV: 'production',
          SESSION_SECRET: 'short-SECRET-SENTINEL',
          BLIZZARD_CLIENT_SECRET: BLIZZARD_SECRET,
          REDIS_URL: `ftp://default:${REDIS_PASSWORD}@cache.example.com`,
          COOKIE_SECURE: 'false',
        }),
      );

      for (const key of [
        'BLIZZARD_CLIENT_ID',
        'BLIZZARD_REDIRECT_URI',
        'CLIENT_URL',
        'SESSION_SECRET',
        'COOKIE_SECURE',
        'REDIS_URL',
      ]) {
        expect(message).toContain(key);
      }
      expect(message).not.toContain('short-SECRET-SENTINEL');
      expect(message).not.toContain(BLIZZARD_SECRET);
      expect(message).not.toContain(REDIS_PASSWORD);
    });
  });
});
