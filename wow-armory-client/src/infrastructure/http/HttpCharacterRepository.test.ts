import { describe, expect, it } from 'vitest';
import {
  CharacterUnavailable,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { CharacterDto } from './CharacterDto';
import type { HttpClient } from './HttpClient';
import { HttpError } from './HttpError';
import { HttpCharacterRepository } from './HttpCharacterRepository';

class StubHttpClient implements HttpClient {
  calls: string[] = [];

  constructor(
    private readonly handler: (path: string) => Promise<unknown>,
  ) {}

  get<T>(path: string): Promise<T> {
    this.calls.push(path);
    return this.handler(path) as Promise<T>;
  }

  post<T>(): Promise<T> {
    return Promise.reject(new Error('post is not used'));
  }
}

const dto: CharacterDto = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  class: 'Warrior',
  race: 'Orc',
  spec: 'Arms',
  itemLevel: 245,
  achievementPoints: 12345,
};

describe('HttpCharacterRepository', () => {
  it('encodes both path segments', async () => {
    const http = new StubHttpClient(async () => dto);
    const repository = new HttpCharacterRepository(http);

    await repository.findByRealmAndName('a/realm', 'name with space');

    expect(http.calls).toEqual([
      '/characters/a%2Frealm/name%20with%20space',
    ]);
  });

  it('maps a successful response to the domain model', async () => {
    const http = new StubHttpClient(async () => dto);
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).resolves.toMatchObject({
      name: 'Billiemoi',
      realmSlug: 'grobbulus',
      characterClass: 'Warrior',
      specialization: 'Arms',
    });
  });

  it('returns null on 404', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 404 });
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'missing'),
    ).resolves.toBeNull();
  });

  it('maps 400 to CharacterValidation', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 400 });
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterValidation);
  });

  it('maps 429 to CharacterRateLimited with Retry-After', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 429, retryAfterSeconds: 42 });
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).rejects.toMatchObject({ retryAfterSeconds: 42 });
  });

  it('maps 502 to CharacterUnavailable', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 502 });
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterUnavailable);
  });

  it('maps network errors to CharacterUnavailable', async () => {
    const http = new StubHttpClient(async () => {
      throw new HttpError({ status: 0 });
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterUnavailable);
  });

  it('maps unexpected errors to CharacterUnavailable', async () => {
    const http = new StubHttpClient(async () => {
      throw new Error('boom');
    });
    const repository = new HttpCharacterRepository(http);

    await expect(
      repository.findByRealmAndName('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterUnavailable);
  });
});
