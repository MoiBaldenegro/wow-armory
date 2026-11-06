import { CompleteLogin } from './CompleteLogin';
import {
  DEFAULT_TOKEN_SET,
  FakeOAuthProvider,
  InMemorySessionRepository,
} from './testing/fakes';

describe('CompleteLogin', () => {
  function setup() {
    const oauthProvider = new FakeOAuthProvider();
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new CompleteLogin(oauthProvider, sessionRepository);

    return { oauthProvider, sessionRepository, useCase };
  }

  it('rejects a missing state and consumes nothing', async () => {
    const { oauthProvider, useCase } = setup();

    const result = await useCase.execute({ code: 'code' });

    expect(result).toEqual({ ok: false, error: 'invalid_state' });
    expect(oauthProvider.exchangedCodes).toHaveLength(0);
  });

  it('rejects a mismatched state and consumes it', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    await sessionRepository.saveOAuthState('expected-state');

    const result = await useCase.execute({
      code: 'code',
      state: 'tampered-state',
    });

    expect(result).toEqual({ ok: false, error: 'invalid_state' });
    expect(sessionRepository.peekOAuthState()).toBeUndefined();
    expect(oauthProvider.exchangedCodes).toHaveLength(0);
  });

  it('does not allow reusing the same state in a second callback', async () => {
    const { sessionRepository, useCase } = setup();
    await sessionRepository.saveOAuthState('single-use-state');

    const first = await useCase.execute({
      code: 'code',
      state: 'single-use-state',
    });
    const second = await useCase.execute({
      code: 'code',
      state: 'single-use-state',
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, error: 'invalid_state' });
  });

  it('returns access_denied without exchanging the code', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    await sessionRepository.saveOAuthState('state');

    const result = await useCase.execute({
      error: 'access_denied',
      state: 'state',
    });

    expect(result).toEqual({ ok: false, error: 'access_denied' });
    expect(oauthProvider.exchangedCodes).toHaveLength(0);
    expect(sessionRepository.saveCalls).toBe(0);
    expect(sessionRepository.peekOAuthState()).toBeUndefined();
  });

  it('clears the session when the code exchange fails', async () => {
    const { oauthProvider, sessionRepository, useCase } = setup();
    await sessionRepository.saveOAuthState('state');
    oauthProvider.exchangeResult = new Error('upstream failure');

    const result = await useCase.execute({ code: 'code', state: 'state' });

    expect(result).toEqual({ ok: false, error: 'auth_failed' });
    expect(sessionRepository.clearCalls).toBe(1);
    expect(sessionRepository.regenerateCalls).toBe(0);
    expect(await sessionRepository.getSession()).toBeNull();
  });

  it('regenerates the session and stores tokens and expiration on success', async () => {
    const { sessionRepository, useCase } = setup();
    await sessionRepository.saveOAuthState('state');

    const result = await useCase.execute({ code: 'code', state: 'state' });
    const session = await sessionRepository.getSession();

    expect(result).toEqual({ ok: true });
    expect(sessionRepository.regenerateCalls).toBe(1);
    expect(session?.accessToken.value).toBe(DEFAULT_TOKEN_SET.accessToken);
    expect(session?.refreshToken?.value).toBe(DEFAULT_TOKEN_SET.refreshToken);
    expect(session?.battletag).toBe(DEFAULT_TOKEN_SET.battletag);
    expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
