import { Logout } from './Logout';
import { AuthSession } from '../domain/AuthSession';
import { InMemorySessionRepository } from './testing/fakes';

describe('Logout', () => {
  it('destroys the stored session', async () => {
    const sessionRepository = new InMemorySessionRepository();
    sessionRepository.seedSession(
      AuthSession.fromTokenSet({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      }),
    );
    const useCase = new Logout(sessionRepository);

    await useCase.execute();

    expect(sessionRepository.clearCalls).toBe(1);
    expect(await sessionRepository.getSession()).toBeNull();
  });
});
