import { describe, expect, it } from 'vitest';
import {
  CharacterRateLimited,
  CharacterUnavailable,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { HttpClient } from './HttpClient';
import { HttpError } from './HttpError';
import { HttpArmoryRepository } from './HttpArmoryRepository';

class StubHttpClient implements HttpClient {
  calls: string[] = [];
  constructor(private readonly handler: (path: string) => Promise<unknown>) {}
  get<T>(path: string): Promise<T> {
    this.calls.push(path);
    return this.handler(path) as Promise<T>;
  }
  post<T>(): Promise<T> {
    return Promise.reject(new Error('unused'));
  }
}

describe('HttpArmoryRepository', () => {
  it('builds every path with the mode', async () => {
    const http = new StubHttpClient(async () => ({}));
    const repository = new HttpArmoryRepository(http);

    await repository.getStatistics('grobbulus', 'billiemoi', 'classic');
    await repository.getTalents('grobbulus', 'billiemoi', 'retail');
    await repository.getPvp('grobbulus', 'billiemoi', 'classic');
    await repository.getHunterPets('grobbulus', 'billiemoi', 'classic');
    await repository.getGuild('grobbulus', 'the horde', 'classic');
    await repository.listRealms('retail');
    await repository.getAuctionPrices('grobbulus', [1, 2], 'horde', 'classic');
    await repository.getPvpLeaderboard('3v3', 'classic', 2);

    expect(http.calls).toEqual([
      '/characters/grobbulus/billiemoi/statistics?mode=classic',
      '/characters/grobbulus/billiemoi/talents?mode=retail',
      '/characters/grobbulus/billiemoi/pvp?mode=classic',
      '/characters/grobbulus/billiemoi/hunter-pets?mode=classic',
      '/guilds/grobbulus/the%20horde?mode=classic',
      '/realms?mode=retail',
      '/auctions/grobbulus/prices?items=1,2&faction=horde&mode=classic',
      '/leaderboards/pvp/3v3?mode=classic&region=2',
    ]);
  });

  it('returns null or [] on 404', async () => {
    const repository = new HttpArmoryRepository(
      new StubHttpClient(async () => {
        throw new HttpError({ status: 404 });
      }),
    );

    await expect(repository.getGuild('grobbulus', 'x', 'classic')).resolves.toBeNull();
    await expect(repository.getHunterPets('grobbulus', 'x', 'classic')).resolves.toEqual([]);
    await expect(repository.listRealms('classic')).resolves.toEqual([]);
  });

  it.each([
    [400, CharacterValidation],
    [429, CharacterRateLimited],
    [502, CharacterUnavailable],
    [0, CharacterUnavailable],
  ])('maps HTTP %s to a domain error', async (status, type) => {
    const repository = new HttpArmoryRepository(
      new StubHttpClient(async () => {
        throw new HttpError({ status });
      }),
    );

    await expect(repository.getStatistics('a', 'b', 'classic')).rejects.toBeInstanceOf(type);
  });
});
