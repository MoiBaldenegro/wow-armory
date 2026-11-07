import { describe, expect, it } from 'vitest';
import type { Character } from '../../domain/character/Character';
import {
  CharacterNotFound,
  CharacterRateLimited,
  CharacterUnavailable,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import { InMemoryCharacterRepository } from '../../test/fakes';
import { GetCharacter } from './GetCharacter';

const character: Character = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  characterClass: 'Warrior',
  race: 'Orc',
  specialization: 'Arms',
  itemLevel: 245,
  achievementPoints: 12345,
};

describe('GetCharacter', () => {
  it('returns the character from the repository', async () => {
    const repository = new InMemoryCharacterRepository();
    repository.result = character;
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).resolves.toEqual(character);
    expect(repository.calls).toEqual([
      { realmSlug: 'grobbulus', characterName: 'billiemoi' },
    ]);
  });

  it('throws CharacterNotFound when the repository returns null', async () => {
    const repository = new InMemoryCharacterRepository();
    repository.result = null;
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('grobbulus', 'missing'),
    ).rejects.toBeInstanceOf(CharacterNotFound);
  });

  it('propagates CharacterRateLimited', async () => {
    const repository = new InMemoryCharacterRepository();
    repository.error = new CharacterRateLimited(42);
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterRateLimited);
  });

  it('propagates CharacterUnavailable', async () => {
    const repository = new InMemoryCharacterRepository();
    repository.error = new CharacterUnavailable();
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterUnavailable);
  });

  it('validates the realm slug before calling the repository', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('Grobbulus', 'billiemoi'),
    ).rejects.toBeInstanceOf(CharacterValidation);
    expect(repository.calls).toHaveLength(0);
  });

  it('validates the character name before calling the repository', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new GetCharacter(repository);

    await expect(
      useCase.execute('grobbulus', 'bad/name'),
    ).rejects.toBeInstanceOf(CharacterValidation);
    expect(repository.calls).toHaveLength(0);
  });
});
