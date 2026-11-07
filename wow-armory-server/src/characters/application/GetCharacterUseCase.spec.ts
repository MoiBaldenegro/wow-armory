import { FakeCharacterRepository, buildCharacter } from './testing/fakes';
import { GetCharacterUseCase } from './GetCharacterUseCase';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
  CharacterNotFound,
  InvalidCharacterName,
  InvalidRealmSlug,
} from '../domain/errors/CharacterError';

describe('GetCharacterUseCase', () => {
  function setup() {
    const repository = new FakeCharacterRepository();
    const useCase = new GetCharacterUseCase(repository);

    return { repository, useCase };
  }

  it('returns the character from the repository', async () => {
    const { repository, useCase } = setup();
    const character = buildCharacter();
    repository.result = character;

    const result = await useCase.execute('grobbulus', 'billiemoi');

    expect(result).toBe(character);
    expect(repository.calls).toEqual([
      { realm: 'grobbulus', name: 'billiemoi' },
    ]);
  });

  it('throws CharacterNotFound when the repository returns null', async () => {
    const { repository, useCase } = setup();
    repository.result = null;

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterNotFound);
    expect(repository.calls).toHaveLength(1);
  });

  it('validates the realm before calling the repository', async () => {
    const { repository, useCase } = setup();

    await expect(useCase.execute('../etc', 'billiemoi')).rejects.toBeInstanceOf(
      InvalidRealmSlug,
    );
    expect(repository.calls).toHaveLength(0);
  });

  it('validates the name before calling the repository', async () => {
    const { repository, useCase } = setup();

    await expect(
      useCase.execute('grobbulus', 'billiemoi/../admin'),
    ).rejects.toBeInstanceOf(InvalidCharacterName);
    expect(repository.calls).toHaveLength(0);
  });

  it('propagates BlizzardRateLimited from the repository', async () => {
    const { repository, useCase } = setup();
    repository.result = new BlizzardRateLimited(30);

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(BlizzardRateLimited);
  });

  it('propagates BlizzardUnavailable from the repository', async () => {
    const { repository, useCase } = setup();
    repository.result = new BlizzardUnavailable();

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
  });
});
