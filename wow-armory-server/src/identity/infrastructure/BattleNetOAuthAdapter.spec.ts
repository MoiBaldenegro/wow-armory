import axios from 'axios';
import { OAuthState } from '../domain/OAuthState';
import { RefreshToken } from '../domain/RefreshToken';
import { BattleNetOAuthAdapter } from './BattleNetOAuthAdapter';

const TOKEN_URL = 'https://oauth.battle.net/token';
const USERINFO_URL = 'https://oauth.battle.net/userinfo';

function createAdapter(): BattleNetOAuthAdapter {
  return new BattleNetOAuthAdapter({
    clientId: 'test-client',
    clientSecret: 'super-secret',
    redirectUri: 'https://api.example.com/auth/callback',
  });
}

describe('BattleNetOAuthAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the Battle.net authorization URL without leaking the client secret', () => {
    const adapter = createAdapter();

    const url = new URL(
      adapter.buildAuthorizationUrl(OAuthState.create('random-state')),
    );

    expect(url.origin).toBe('https://oauth.battle.net');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.example.com/auth/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(
      'openid battletag wow.profile',
    );
    expect(url.searchParams.get('state')).toBe('random-state');
    expect(url.toString()).not.toContain('super-secret');
  });

  it('sends the code exchange credentials in the form body, not in the URL', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      },
    } as never);
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        id: 12345,
        battletag: 'Tester#1234',
      },
    } as never);
    const adapter = createAdapter();

    const tokenSet = await adapter.exchangeCode('authorization-code');

    expect(tokenSet.accessToken).toBe('access-token');
    expect(tokenSet.battletag).toBe('Tester#1234');
    expect(tokenSet.accountId).toBe('12345');
    expect(get).toHaveBeenCalledWith(
      USERINFO_URL,
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' },
      }),
    );

    const [url, body, config] = post.mock.calls[0] as [
      string,
      URLSearchParams,
      { headers?: Record<string, string>; params?: unknown },
    ];

    expect(url).toBe(TOKEN_URL);
    expect(url).not.toContain('client_secret');
    expect(url).not.toContain('authorization-code');
    expect(url).not.toContain('super-secret');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.get('client_id')).toBe('test-client');
    expect(body.get('client_secret')).toBe('super-secret');
    expect(body.get('code')).toBe('authorization-code');
    expect(body.get('redirect_uri')).toBe(
      'https://api.example.com/auth/callback',
    );
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('refresh_token')).toBeNull();
    expect(config.params).toBeUndefined();
    expect(config.headers?.['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('sends the refresh token in the form body, not in the URL', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'new-access-token',
        expires_in: 3600,
      },
    } as never);
    const adapter = createAdapter();

    const tokenSet = await adapter.refresh(
      RefreshToken.create('refresh-token-value'),
    );

    expect(tokenSet.accessToken).toBe('new-access-token');

    const [url, body, config] = post.mock.calls[0] as [
      string,
      URLSearchParams,
      { headers?: Record<string, string>; params?: unknown },
    ];

    expect(url).toBe(TOKEN_URL);
    expect(url).not.toContain('refresh-token-value');
    expect(url).not.toContain('client_secret');
    expect(url).not.toContain('super-secret');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.get('client_id')).toBe('test-client');
    expect(body.get('client_secret')).toBe('super-secret');
    expect(body.get('refresh_token')).toBe('refresh-token-value');
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('code')).toBeNull();
    expect(config.params).toBeUndefined();
    expect(config.headers?.['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });
});
