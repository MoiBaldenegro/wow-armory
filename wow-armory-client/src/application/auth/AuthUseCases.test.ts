import { describe, expect, it } from 'vitest';
import { InMemoryAuthRepository } from '../../test/fakes';
import { CheckSession } from './CheckSession';
import { Logout } from './Logout';
import { StartLogin } from './StartLogin';

describe('auth use cases', () => {
  it('CheckSession delegates to the auth repository', async () => {
    const repository = new InMemoryAuthRepository();
    repository.session = {
      authenticated: true,
      user: { battletag: 'Player#1234' },
    };

    await expect(new CheckSession(repository).execute()).resolves.toEqual(
      repository.session,
    );
  });

  it('StartLogin returns the authorization URL', async () => {
    const repository = new InMemoryAuthRepository();
    repository.loginUrl = 'https://oauth.battle.net/authorize?state=abc';

    await expect(new StartLogin(repository).execute()).resolves.toBe(
      repository.loginUrl,
    );
  });

  it('Logout delegates to the auth repository', async () => {
    const repository = new InMemoryAuthRepository();

    await new Logout(repository).execute();

    expect(repository.logoutCalls).toBe(1);
  });
});
