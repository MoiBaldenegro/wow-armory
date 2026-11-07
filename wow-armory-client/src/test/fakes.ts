import { CheckSession } from '../application/auth/CheckSession';
import { Logout } from '../application/auth/Logout';
import { StartLogin } from '../application/auth/StartLogin';
import { GetCharacter } from '../application/character/GetCharacter';
import type { AuthRepository } from '../domain/auth/ports/AuthRepository';
import type { Session } from '../domain/auth/Session';
import type { Character } from '../domain/character/Character';
import type { CharacterRepository } from '../domain/character/ports/CharacterRepository';
import type { UseCases } from '../infrastructure/container';

export class InMemoryCharacterRepository implements CharacterRepository {
  calls: Array<{ realmSlug: string; characterName: string }> = [];
  result: Character | null = null;
  error: unknown;

  async findByRealmAndName(
    realmSlug: string,
    characterName: string,
  ): Promise<Character | null> {
    this.calls.push({ realmSlug, characterName });

    if (this.error !== undefined) {
      throw this.error;
    }

    return this.result;
  }
}

export class InMemoryAuthRepository implements AuthRepository {
  session: Session = { authenticated: false };
  loginUrl = 'https://oauth.battle.net/authorize';
  sessionError: unknown;
  loginError: unknown;
  logoutError: unknown;
  logoutCalls = 0;

  async getSession(): Promise<Session> {
    if (this.sessionError !== undefined) {
      throw this.sessionError;
    }

    return this.session;
  }

  async getLoginUrl(): Promise<string> {
    if (this.loginError !== undefined) {
      throw this.loginError;
    }

    return this.loginUrl;
  }

  async logout(): Promise<void> {
    this.logoutCalls += 1;

    if (this.logoutError !== undefined) {
      throw this.logoutError;
    }
  }
}

export interface TestDependencies {
  useCases: UseCases;
  characterRepository: InMemoryCharacterRepository;
  authRepository: InMemoryAuthRepository;
}

export function createTestDependencies(
  overrides: Partial<UseCases> = {},
): TestDependencies {
  const characterRepository = new InMemoryCharacterRepository();
  const authRepository = new InMemoryAuthRepository();

  const useCases: UseCases = {
    getCharacter: new GetCharacter(characterRepository),
    checkSession: new CheckSession(authRepository),
    startLogin: new StartLogin(authRepository),
    logout: new Logout(authRepository),
    ...overrides,
  };

  return { useCases, characterRepository, authRepository };
}
