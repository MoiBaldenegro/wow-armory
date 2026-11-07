import { RefreshToken } from './RefreshToken';
import { AuthSession } from '../domain/AuthSession';
import { FakeOAuthProvider, InMemorySessionRepository } from './testing/fakes';

function sessionWithRefreshToken(): AuthSession {
  return AuthSession.fromTokenSet({
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    expiresIn: 3600,
  });
}

describe('RefreshToken', () => {
  function setup() {
    const oauthProvider = new FakeOAuthProvider();
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new RefreshToken(oauthProvider, sessionRepository);

    return { oauthProvider, sessionRepository, useCase };
  }

  it('returns null when there is no session', async () => {
    const { useCase } = setup();

    expect(await useCase.execute()).toBeNull();
  });

  it('refreshes the token and stores the new session', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    sessionRepository.seedSession(sessionWithRefreshToken());

    const refreshed = await useCase.execute();

    expect(oauthProvider.refreshedTokens).toEqual(['old-refresh-token']);
    expect(refreshed?.accessToken.value).toBe('refreshed-access-token');
    const stored = await sessionRepository.getSession();
    expect(stored?.accessToken.value).toBe('refreshed-access-token');
  });

  it('clears the session when the provider fails', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    sessionRepository.seedSession(sessionWithRefreshToken());
    oauthProvider.refreshResult = new Error('refresh failed');

    const result = await useCase.execute();

    expect(result).toBeNull();
    expect(sessionRepository.clearCalls).toBe(1);
    expect(await sessionRepository.getSession()).toBeNull();
  });

  it('clears the session when there is no refresh token', async () => {
    const { sessionRepository, useCase } = setup();
    sessionRepository.seedSession(
      AuthSession.fromTokenSet({
        accessToken: 'access-token',
        expiresIn: 3600,
      }),
    );

    const result = await useCase.execute();

    expect(result).toBeNull();
    expect(sessionRepository.clearCalls).toBe(1);
  });
});
