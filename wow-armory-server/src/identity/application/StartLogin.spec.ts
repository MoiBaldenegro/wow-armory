import { StartLogin } from './StartLogin';
import { FakeOAuthProvider, InMemorySessionRepository } from './testing/fakes';

describe('StartLogin', () => {
  it('generates a new state, stores it and returns the authorization URL', async () => {
    const oauthProvider = new FakeOAuthProvider();
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new StartLogin(oauthProvider, sessionRepository);

    const result = await useCase.execute();

    const state = sessionRepository.peekOAuthState();
    expect(state).toBeDefined();
    expect(oauthProvider.authorizationStates).toEqual([state]);
    expect(result.url).toContain(`state=${state}`);
  });

  it('generates a different state for every login attempt', async () => {
    const oauthProvider = new FakeOAuthProvider();
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new StartLogin(oauthProvider, sessionRepository);

    const first = await useCase.execute();
    const firstState = sessionRepository.peekOAuthState();
    const second = await useCase.execute();
    const secondState = sessionRepository.peekOAuthState();

    expect(first.url).not.toBe(second.url);
    expect(firstState).not.toBe(secondState);
  });
});
