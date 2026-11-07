import { CheckSession } from './CheckSession';
import { RefreshToken } from './RefreshToken';
import { AuthSession } from '../domain/AuthSession';
import { FakeOAuthProvider, InMemorySessionRepository } from './testing/fakes';

const REFRESH_MARGIN_MS = 60_000;

function createSession(options?: {
  expiresIn?: number;
  refreshToken?: string;
}): AuthSession {
  return AuthSession.fromTokenSet({
    accessToken: 'access-token',
    refreshToken: options?.refreshToken ?? 'refresh-token',
    expiresIn: options?.expiresIn ?? 3600,
    battletag: 'Player#1234',
  });
}

describe('CheckSession', () => {
  function setup() {
    const oauthProvider = new FakeOAuthProvider();
    const sessionRepository = new InMemorySessionRepository();
    const refreshToken = new RefreshToken(oauthProvider, sessionRepository);
    const useCase = new CheckSession(
      sessionRepository,
      refreshToken,
      REFRESH_MARGIN_MS,
    );

    return { oauthProvider, sessionRepository, useCase };
  }

  it('returns authenticated false when there is no session', async () => {
    const { oauthProvider, useCase } = setup();

    const result = await useCase.execute();

    expect(result).toEqual({ authenticated: false });
    expect(oauthProvider.refreshedTokens).toHaveLength(0);
  });

  it('returns the battletag for a valid session', async () => {
    const { useCase, sessionRepository } = setup();
    sessionRepository.seedSession(createSession());

    const result = await useCase.execute();

    expect(result).toEqual({
      authenticated: true,
      user: { battletag: 'Player#1234' },
    });
  });

  it('refreshes the token before answering when it is close to expiry', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    sessionRepository.seedSession(createSession({ expiresIn: 10 }));

    const result = await useCase.execute();

    expect(oauthProvider.refreshedTokens).toEqual(['refresh-token']);
    expect(result.authenticated).toBe(true);
    const session = await sessionRepository.getSession();
    expect(session?.accessToken.value).toBe('refreshed-access-token');
    expect(session?.refreshToken?.value).toBe('refresh-token');
  });

  it('clears the session and reports false when the refresh fails', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    sessionRepository.seedSession(createSession({ expiresIn: 10 }));
    oauthProvider.refreshResult = new Error('refresh failed');

    const result = await useCase.execute();

    expect(result).toEqual({ authenticated: false });
    expect(sessionRepository.clearCalls).toBe(1);
    expect(await sessionRepository.getSession()).toBeNull();
  });

  it('does not refresh when the token is comfortably valid', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    sessionRepository.seedSession(createSession({ expiresIn: 3600 }));

    await useCase.execute();

    expect(oauthProvider.refreshedTokens).toHaveLength(0);
  });
});
