import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
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

  it('keeps the legacy character endpoint alive', async () => {
    await request(app.getHttpServer())
      .get('/auth/character/grobbulus/billiemoi')
      .expect(401);
  });
});
