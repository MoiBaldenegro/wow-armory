import { CheckSession } from '../application/auth/CheckSession';
import { Logout } from '../application/auth/Logout';
import { StartLogin } from '../application/auth/StartLogin';
import { GetCharacter } from '../application/character/GetCharacter';
import type { AuthRepository } from '../domain/auth/ports/AuthRepository';
import type { Session } from '../domain/auth/Session';
import type { Character } from '../domain/character/Character';
import type { CharacterRepository } from '../domain/character/ports/CharacterRepository';
import type { UseCases } from '../infrastructure/container';
import { ArmoryQueries } from '../application/armory/ArmoryQueries';
import type {
  AuctionFaction,
  AuctionPrices,
  CharacterPvp,
  CharacterStatistics,
  CharacterTalents,
  GuildProfile,
  HunterPet,
  PvpLeaderboard,
  RealmSummary,
  WowMode,
} from '../domain/armory/Armory';
import type { ArmoryRepository } from '../domain/armory/ports/ArmoryRepository';

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

/** Armory repository returning canned data; unset fields answer "missing". */
export class InMemoryArmoryRepository implements ArmoryRepository {
  statistics: CharacterStatistics | null = null;
  talents: CharacterTalents | null = null;
  pvp: CharacterPvp | null = null;
  pets: HunterPet[] = [];
  guild: GuildProfile | null = null;
  realms: RealmSummary[] = [];
  prices: AuctionPrices | null = null;
  leaderboard: PvpLeaderboard | null = null;
  error: unknown;
  calls: string[] = [];

  private answer<T>(call: string, value: T): Promise<T> {
    this.calls.push(call);
    return this.error !== undefined ? Promise.reject(this.error) : Promise.resolve(value);
  }

  getStatistics(realm: string, name: string, mode: WowMode) {
    return this.answer(`statistics:${mode}:${realm}:${name}`, this.statistics);
  }
  getTalents(realm: string, name: string, mode: WowMode) {
    return this.answer(`talents:${mode}:${realm}:${name}`, this.talents);
  }
  getPvp(realm: string, name: string, mode: WowMode) {
    return this.answer(`pvp:${mode}:${realm}:${name}`, this.pvp);
  }
  getHunterPets(realm: string, name: string, mode: WowMode) {
    return this.answer(`pets:${mode}:${realm}:${name}`, this.pets);
  }
  getGuild(realm: string, slug: string, mode: WowMode) {
    return this.answer(`guild:${mode}:${realm}:${slug}`, this.guild);
  }
  listRealms(mode: WowMode) {
    return this.answer(`realms:${mode}`, this.realms);
  }
  getAuctionPrices(realm: string, ids: number[], faction: AuctionFaction, mode: WowMode) {
    return this.answer(`auctions:${mode}:${realm}:${faction}:${ids.join(',')}`, this.prices);
  }
  getPvpLeaderboard(bracket: string, mode: WowMode, region?: number) {
    return this.answer(`leaderboard:${mode}:${bracket}:${region ?? ''}`, this.leaderboard);
  }
}

export function withArmory(repository: InMemoryArmoryRepository): Partial<UseCases> {
  return { armory: new ArmoryQueries(repository) };
}
