import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BlizzardUnavailable } from '../domain/errors/CharacterError';
import { ClientCredentialsTokenProvider } from './ClientCredentialsTokenProvider';

const TOKEN_URL = 'https://oauth.battle.net/token';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
  } as unknown as ConfigService;
}

function tokenResponse(accessToken: string, expiresIn: number) {
  return {
    data: { access_token: accessToken, expires_in: expiresIn },
  } as never;
}

describe('ClientCredentialsTokenProvider', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requests a token with the client_credentials grant in a form body', async () => {
    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValue(tokenResponse('token-1', 3600));
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await expect(provider.getAccessToken()).resolves.toBe('token-1');

    const [url, body, config] = post.mock.calls[0] as [
      string,
      URLSearchParams,
      { headers?: Record<string, string> },
    ];

    expect(url).toBe(TOKEN_URL);
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('client_secret')).toBe('client-secret');
    expect(config.headers?.['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('reuses the cached token until it expires', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValue(tokenResponse('cached-token', 3600));
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await provider.getAccessToken();
    jest.setSystemTime(new Date('2026-01-01T00:58:59Z'));
    await expect(provider.getAccessToken()).resolves.toBe('cached-token');

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('requests a new token after the refresh margin elapses', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValueOnce(tokenResponse('token-1', 3600))
      .mockResolvedValueOnce(tokenResponse('token-2', 3600));
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await expect(provider.getAccessToken()).resolves.toBe('token-1');
    jest.setSystemTime(new Date('2026-01-01T00:59:01Z'));

    await expect(provider.getAccessToken()).resolves.toBe('token-2');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent requests into a single token call', async () => {
    const post = jest
      .spyOn(axios, 'post')
      .mockResolvedValue(tokenResponse('token-1', 3600));
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await Promise.all([
      provider.getAccessToken(),
      provider.getAccessToken(),
      provider.getAccessToken(),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('translates token failures into BlizzardUnavailable', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('network error'));
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      BlizzardUnavailable,
    );
  });

  it('rejects a response without an access token', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ data: {} } as never);
    const provider = new ClientCredentialsTokenProvider(
      configWith({
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
      }),
    );

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      BlizzardUnavailable,
    );
  });

  it('does not call Battle.net when credentials are missing', async () => {
    const post = jest.spyOn(axios, 'post');
    const provider = new ClientCredentialsTokenProvider(configWith({}));

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(
      BlizzardUnavailable,
    );
    expect(post).not.toHaveBeenCalled();
  });
});
