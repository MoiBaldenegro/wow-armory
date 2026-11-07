import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import {
  buildCharacter,
  FakeCharacterRepository,
} from '../src/characters/application/testing/fakes';
import { CHARACTER_REPOSITORY } from '../src/characters/characters.tokens';
import { FakeOAuthProvider } from '../src/identity/application/testing/fakes';
import { OAUTH_PROVIDER } from '../src/identity/identity.tokens';
import {
  buildThrottlerOptions,
  RATE_LIMIT_MESSAGE,
} from '../src/shared/infrastructure/rate-limit/rate-limit';

const CLIENT_URL = 'http://localhost:5173';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Platform hardening (e2e)', () => {
  let app: INestApplication;
  let repository: FakeCharacterRepository;

  beforeAll(async () => {
    repository = new FakeCharacterRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CHARACTER_REPOSITORY)
      .useValue(repository)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns status, uptime, version and the session store', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      version: expect.any(String),
      sessionStore: { type: 'memory', status: 'up' },
    });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('e2e-session-secret');
    expect(repository.calls).toHaveLength(0);
  });

  it('does not send X-Powered-By', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes a valid X-Request-Id and generates one otherwise', async () => {
    const echoed = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'trace-123')
      .expect(200);

    expect(echoed.headers['x-request-id']).toBe('trace-123');

    const generated = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'not valid!')
      .expect(200);

    expect(generated.headers['x-request-id']).toMatch(UUID);

    const missing = await request(app.getHttpServer())
      .get('/auth/session')
      .expect(200);

    expect(missing.headers['x-request-id']).toMatch(UUID);
  });

  it('exposes X-Request-Id to allow-listed cross-origin clients', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', CLIENT_URL)
      .expect(200);

    expect(response.headers['access-control-expose-headers']).toContain(
      'X-Request-Id',
    );
  });
});

describe('Rate limiting (e2e)', () => {
  const AUTH_LIMIT = 2;
  const PUBLIC_LIMIT = 3;

  async function createLimitedApp(
    repository: FakeCharacterRepository,
    trustProxy?: number,
  ): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getOptionsToken())
      .useValue(
        buildThrottlerOptions({
          ttlMs: 60_000,
          authLimit: AUTH_LIMIT,
          publicLimit: PUBLIC_LIMIT,
        }),
      )
      .overrideProvider(OAUTH_PROVIDER)
      .useValue(new FakeOAuthProvider())
      .overrideProvider(CHARACTER_REPOSITORY)
      .useValue(repository)
      .compile();

    const limited = moduleFixture.createNestApplication();
    configureApp(limited);

    if (trustProxy !== undefined) {
      // Same effect as TRUST_PROXY=<hops>, which configureApp applies.
      limited.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
    }

    await limited.init();
    return limited;
  }

  describe('without a trusted proxy', () => {
    let app: INestApplication;
    let repository: FakeCharacterRepository;

    beforeAll(async () => {
      repository = new FakeCharacterRepository();
      app = await createLimitedApp(repository);
    });

    beforeEach(() => {
      repository.reset();
      repository.result = buildCharacter();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 429 with Retry-After on /auth/login past the strict limit', async () => {
      for (let i = 0; i < AUTH_LIMIT; i += 1) {
        await request(app.getHttpServer()).get('/auth/login').expect(200);
      }

      const response = await request(app.getHttpServer())
        .get('/auth/login')
        .set('Origin', CLIENT_URL)
        .expect(429);

      expect(response.body).toEqual({
        statusCode: 429,
        message: RATE_LIMIT_MESSAGE,
      });
      expect(response.headers['retry-after']).toMatch(/^\d+$/);
      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
      expect(
        Object.keys(response.headers).filter((name) =>
          name.startsWith('retry-after-'),
        ),
      ).toEqual([]);
      expect(response.headers['access-control-allow-origin']).toBe(CLIENT_URL);
      expect(response.headers['access-control-expose-headers']).toContain(
        'Retry-After',
      );
    });

    it('does not let a spoofed X-Forwarded-For bypass the limit', async () => {
      await request(app.getHttpServer())
        .get('/auth/login')
        .set('X-Forwarded-For', '203.0.113.99')
        .expect(429);
    });

    it('returns 429 on /characters past the public limit', async () => {
      for (let i = 0; i < PUBLIC_LIMIT; i += 1) {
        await request(app.getHttpServer())
          .get('/characters/grobbulus/billiemoi')
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .get('/characters/grobbulus/billiemoi')
        .expect(429);

      expect(response.body).toEqual({
        statusCode: 429,
        message: RATE_LIMIT_MESSAGE,
      });
      expect(response.headers['retry-after']).toMatch(/^\d+$/);
      expect(repository.calls).toHaveLength(PUBLIC_LIMIT);
    });

    it('never rate limits /health', async () => {
      for (let i = 0; i < PUBLIC_LIMIT * 3; i += 1) {
        const response = await request(app.getHttpServer())
          .get('/health')
          .expect(200);

        expect(response.headers['set-cookie']).toBeUndefined();
        expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      }
    });
  });

  describe('behind one trusted proxy', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createLimitedApp(new FakeCharacterRepository(), 1);
    });

    afterAll(async () => {
      await app.close();
    });

    it('tracks the client IP from X-Forwarded-For (req.ip), not the proxy IP', async () => {
      for (let i = 0; i < AUTH_LIMIT; i += 1) {
        await request(app.getHttpServer())
          .get('/auth/login')
          .set('X-Forwarded-For', '198.51.100.1')
          .expect(200);
      }

      await request(app.getHttpServer())
        .get('/auth/login')
        .set('X-Forwarded-For', '198.51.100.1')
        .expect(429);

      await request(app.getHttpServer())
        .get('/auth/login')
        .set('X-Forwarded-For', '198.51.100.2')
        .expect(200);
    });
  });
});
