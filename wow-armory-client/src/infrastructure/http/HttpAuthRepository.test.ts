import { describe, expect, it } from 'vitest';
import {
  AuthInvalidResponse,
  AuthUnavailable,
} from '../../domain/auth/errors/AuthErrors';
import type { HttpClient } from './HttpClient';
import { HttpAuthRepository } from './HttpAuthRepository';
import { HttpError } from './HttpError';

class StubHttpClient implements HttpClient {
  getCalls: string[] = [];
  postCalls: Array<{ path: string; body?: unknown }> = [];

  constructor(
    private readonly getHandler: (path: string) => Promise<unknown> = async () =>
      undefined,
    private readonly postHandler: (path: string) => Promise<unknown> = async () =>
      undefined,
  ) {}

  get<T>(path: string): Promise<T> {
    this.getCalls.push(path);
    return this.getHandler(path) as Promise<T>;
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    this.postCalls.push({ path, body });
    return this.postHandler(path) as Promise<T>;
  }
}

describe('HttpAuthRepository', () => {
  it('maps the session response', async () => {
    const http = new StubHttpClient(async () => ({
      authenticated: true,
      user: { battletag: 'Player#1234' },
    }));

    await expect(new HttpAuthRepository(http).getSession()).resolves.toEqual({
      authenticated: true,
      user: { battletag: 'Player#1234' },
    });
    expect(http.getCalls).toEqual(['/auth/session']);
  });

  it('maps an anonymous session', async () => {
    const http = new StubHttpClient(async () => ({ authenticated: false }));

    await expect(new HttpAuthRepository(http).getSession()).resolves.toEqual({
      authenticated: false,
    });
  });

  it('returns the login URL', async () => {
    const http = new StubHttpClient(async () => ({
      url: 'https://oauth.battle.net/authorize',
    }));

    await expect(
      new HttpAuthRepository(http).getLoginUrl(),
    ).resolves.toBe('https://oauth.battle.net/authorize');
    expect(http.getCalls).toEqual(['/auth/login']);
  });

  it('posts logout', async () => {
    const http = new StubHttpClient();

    await new HttpAuthRepository(http).logout();

    expect(http.postCalls).toEqual([{ path: '/auth/logout', body: null }]);
  });

  it('rejects invalid session payloads', async () => {
    const http = new StubHttpClient(async () => ({ user: {} }));

    await expect(
      new HttpAuthRepository(http).getSession(),
    ).rejects.toBeInstanceOf(AuthInvalidResponse);
  });

  it('rejects empty login URLs', async () => {
    const http = new StubHttpClient(async () => ({ url: '' }));

    await expect(
      new HttpAuthRepository(http).getLoginUrl(),
    ).rejects.toBeInstanceOf(AuthInvalidResponse);
  });

  it('maps 4xx responses to AuthInvalidResponse', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 401 });
    });

    await expect(
      new HttpAuthRepository(http).getSession(),
    ).rejects.toBeInstanceOf(AuthInvalidResponse);
  });

  it('maps 5xx responses to AuthUnavailable', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 503 });
    });

    await expect(
      new HttpAuthRepository(http).getSession(),
    ).rejects.toBeInstanceOf(AuthUnavailable);
  });

  it('maps network errors to AuthUnavailable', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 0 });
    });

    await expect(
      new HttpAuthRepository(http).getLoginUrl(),
    ).rejects.toBeInstanceOf(AuthUnavailable);
  });
});
