import type { Character } from '../../domain/character/Character';
import {
  CharacterNotFound,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { CharacterRepository } from '../../domain/character/ports/CharacterRepository';

export const REALM_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
export const CHARACTER_NAME_PATTERN = /^[A-Za-z0-9'-]{1,64}$/;

export class GetCharacter {
  constructor(private readonly repository: CharacterRepository) {}

  async execute(realmSlug: string, characterName: string): Promise<Character> {
    if (!REALM_SLUG_PATTERN.test(realmSlug)) {
      throw new CharacterValidation('Invalid realm slug.');
    }

    if (!CHARACTER_NAME_PATTERN.test(characterName)) {
      throw new CharacterValidation('Invalid character name.');
    }

    const character = await this.repository.findByRealmAndName(
      realmSlug,
      characterName,
    );

    if (character === null) {
      throw new CharacterNotFound(
        `Character ${characterName} was not found on ${realmSlug}.`,
      );
    }

    return character;
  }
}
