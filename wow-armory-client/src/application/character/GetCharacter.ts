import type { Character } from '../../domain/character/Character';
import {
  CharacterNotFound,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { CharacterRepository } from '../../domain/character/ports/CharacterRepository';
import type { WowMode } from '../../domain/armory/Armory';

export const REALM_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
export const CHARACTER_NAME_PATTERN = /^[\p{L}\p{M}0-9'-]{1,64}$/u;

export class GetCharacter {
  constructor(private readonly repository: CharacterRepository) {}

  async execute(
    realmSlug: string,
    characterName: string,
    mode: WowMode = 'classic',
  ): Promise<Character> {
    if (!REALM_SLUG_PATTERN.test(realmSlug)) {
      throw new CharacterValidation('Invalid realm slug.');
    }

    if (!CHARACTER_NAME_PATTERN.test(characterName)) {
      throw new CharacterValidation('Invalid character name.');
    }

    const character = await this.repository.findByRealmAndName(
      realmSlug,
      characterName,
      mode,
    );

    if (character === null) {
      throw new CharacterNotFound(
        `Character ${characterName} was not found on ${realmSlug}.`,
      );
    }

    return character;
  }
}
