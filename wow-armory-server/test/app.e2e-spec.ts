import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import {
  buildCharacter,
  FakeCharacterRepository,
} from '../src/characters/application/testing/fakes';
import { CHARACTER_REPOSITORY } from '../src/characters/characters.tokens';
import { Achievement } from '../src/characters/domain/Achievement';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
} from '../src/characters/domain/errors/CharacterError';
import { Guild } from '../src/characters/domain/Guild';
import {
  DEFAULT_TOKEN_SET,
  FakeOAuthProvider,
} from '../src/identity/application/testing/fakes';
import { OAUTH_PROVIDER } from '../src/identity/identity.tokens';

const CLIENT_URL = 'http://localhost:5173';

describe('Identity authentication (e2e)', () => {
  let app: INestApplication;
  let oauthProvider: FakeOAuthProvider;

  beforeAll(async () => {
    oauthProvider = new FakeOAuthProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OAUTH_PROVIDER)
      .useValue(oauthProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    oauthProvider.authorizationStates = [];
    oauthProvider.exchangedCodes = [];
    oauthProvider.refreshedTokens = [];
    oauthProvider.exchangeResult = { ...DEFAULT_TOKEN_SET };
    oauthProvider.refreshResult = {
      ...DEFAULT_TOKEN_SET,
      accessToken: 'refreshed-access-token',
      refreshToken: undefined,
    };
  });

  function stateFromLogin(loginResponse: { body: { url: string } }): string {
    const url = new URL(loginResponse.body.url);
    const state = url.searchParams.get('state');

    expect(state).toBeTruthy();
    return state as string;
  }

  it('GET /auth/login returns a Battle.net authorization URL with a new state', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/login')
      .expect(200);

    const url = new URL(response.body.url as string);

    expect(url.origin).toBe('https://oauth.battle.net');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/auth/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('wow.profile');
    expect(url.searchParams.get('state')).toHaveLength(64);
  });

  it('redirects with auth_error=invalid_state when the state is missing or wrong', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .get('/auth/callback?code=code')
      .expect(302)
      .expect('Location', `${CLIENT_URL}?auth_error=invalid_state`);

    const login = await agent.get('/auth/login').expect(200);
    const state = stateFromLogin(login);

    await agent
      .get(`/auth/callback?code=code&state=wrong-${state}`)
      .expect(302)
      .expect('Location', `${CLIENT_URL}?auth_error=invalid_state`);
  });

  it('rejects reusing the same state in a second callback', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent.get('/auth/login').expect(200);
    const state = stateFromLogin(login);

    await agent
      .get(`/auth/callback?code=good-code&state=${state}`)
      .expect(302)
      .expect('Location', CLIENT_URL);

    await agent
      .get(`/auth/callback?code=good-code&state=${state}`)
      .expect(302)
      .expect('Location', `${CLIENT_URL}?auth_error=invalid_state`);

    expect(oauthProvider.exchangedCodes).toEqual(['good-code']);
  });

  it('returns access_denied without exchanging the code or storing tokens', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.get('/auth/login').expect(200);

    await agent
      .get('/auth/callback?error=access_denied')
      .expect(302)
      .expect('Location', `${CLIENT_URL}?auth_error=access_denied`);

    expect(oauthProvider.exchangedCodes).toHaveLength(0);

    await agent
      .get('/auth/session')
      .expect(200)
      .expect({ authenticated: false });
  });

  it('completes login, keeps the session on reload and logs out with POST', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent.get('/auth/login').expect(200);
    const state = stateFromLogin(login);

    await agent
      .get(`/auth/callback?code=good-code&state=${state}`)
      .expect(302)
      .expect('Location', CLIENT_URL);

    await agent
      .get('/auth/session')
      .expect(200)
      .expect({
        authenticated: true,
        user: { battletag: 'Player#1234' },
      });

    const logout = await agent.post('/auth/logout').expect(204);
    const logoutCookie = logout.headers['set-cookie']?.[0] ?? '';

    expect(logoutCookie).toContain('wow_session=');
    expect(logoutCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);

    await agent
      .get('/auth/session')
      .expect(200)
      .expect({ authenticated: false });
  });

  it('redirects with auth_error=auth_failed when the exchange fails', async () => {
    oauthProvider.exchangeResult = new Error('upstream failure');

    const agent = request.agent(app.getHttpServer());
    const login = await agent.get('/auth/login').expect(200);
    const state = stateFromLogin(login);

    await agent
      .get(`/auth/callback?code=bad-code&state=${state}`)
      .expect(302)
      .expect('Location', `${CLIENT_URL}?auth_error=auth_failed`);

    await agent
      .get('/auth/session')
      .expect(200)
      .expect({ authenticated: false });
  });

  it('removes /auth/session-check and GET /auth/logout', async () => {
    await request(app.getHttpServer()).get('/auth/session-check').expect(404);
    await request(app.getHttpServer()).get('/auth/logout').expect(404);
  });
});

describe('Characters (e2e)', () => {
  let app: INestApplication;
  let repository: FakeCharacterRepository;

  const LOGIN_TIMESTAMP = 1700000000000;

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

  beforeEach(() => {
    repository.reset();
  });

  function seedCharacter(): void {
    repository.result = buildCharacter({
      specialization: 'Arms',
      lastLogin: new Date(LOGIN_TIMESTAMP),
      guild: Guild.create({
        name: 'Warbringers',
        realm: 'Grobbulus',
        rank: 3,
        memberCount: 120,
      }),
      achievements: [
        Achievement.create({
          id: 1234,
          name: 'Level 60',
          points: 10,
          completedAt: new Date(LOGIN_TIMESTAMP),
        }),
      ],
    });
  }

  it('returns a stable CharacterDto for a valid request', async () => {
    seedCharacter();

    const response = await request(app.getHttpServer())
      .get('/characters/grobbulus/billiemoi')
      .expect(200);

    expect(response.body).toEqual({
      name: 'Billiemoi',
      realmSlug: 'grobbulus',
      level: 60,
      class: 'Warrior',
      race: 'Orc',
      spec: 'Arms',
      itemLevel: 245,
      achievementPoints: 12345,
      lastLogin: new Date(LOGIN_TIMESTAMP).toISOString(),
      guild: {
        name: 'Warbringers',
        realm: 'Grobbulus',
        rank: 3,
        memberCount: 120,
      },
      achievements: [
        {
          id: 1234,
          name: 'Level 60',
          points: 10,
          completedAt: new Date(LOGIN_TIMESTAMP).toISOString(),
        },
      ],
    });
    expect(repository.calls).toEqual([
      { realm: 'grobbulus', name: 'billiemoi' },
    ]);
  });

  it('rejects invalid path parameters with 400 without calling the repository', async () => {
    await request(app.getHttpServer())
      .get('/characters/Grobbulus/billiemoi')
      .expect(400);

    await request(app.getHttpServer())
      .get('/characters/bad%2Frealm/billiemoi')
      .expect(400);

    expect(repository.calls).toHaveLength(0);
  });

  it('returns 404 when the character does not exist', async () => {
    repository.result = null;

    await request(app.getHttpServer())
      .get('/characters/grobbulus/missing')
      .expect(404);
  });

  it('returns 429 and propagates Retry-After when Blizzard rate limits', async () => {
    repository.result = new BlizzardRateLimited(42);

    const response = await request(app.getHttpServer())
      .get('/characters/grobbulus/billiemoi')
      .expect(429);

    expect(response.headers['retry-after']).toBe('42');
  });

  it('exposes Retry-After to allow-listed cross-origin clients on 429', async () => {
    repository.result = new BlizzardRateLimited(42);

    const response = await request(app.getHttpServer())
      .get('/characters/grobbulus/billiemoi')
      .set('Origin', CLIENT_URL)
      .expect(429);

    expect(response.headers['access-control-allow-origin']).toBe(CLIENT_URL);
    expect(response.headers['access-control-expose-headers']).toContain(
      'Retry-After',
    );
  });

  it('returns a generic 502 when Blizzard is unavailable', async () => {
    repository.result = new BlizzardUnavailable();

    const response = await request(app.getHttpServer())
      .get('/characters/grobbulus/billiemoi')
      .expect(502);

    expect(response.body).toMatchObject({ statusCode: 502 });
  });

  it('removes the legacy character route', async () => {
    await request(app.getHttpServer())
      .get('/auth/character/grobbulus/billiemoi')
      .expect(404);
  });
});
