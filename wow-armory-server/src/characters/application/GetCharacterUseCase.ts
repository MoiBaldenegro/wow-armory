import { Character } from '../domain/Character';
import { CharacterName } from '../domain/CharacterName';
import { CharacterNotFound } from '../domain/errors/CharacterError';
import { CharacterRepository } from '../domain/ports/CharacterRepository';
import { RealmSlug } from '../domain/RealmSlug';

export class GetCharacterUseCase {
  constructor(private readonly repository: CharacterRepository) {}

  async execute(realm: string, name: string): Promise<Character> {
    const realmSlug = RealmSlug.create(realm);
    const characterName = CharacterName.create(name);

    const character = await this.repository.findByRealmAndName(
      realmSlug,
      characterName,
    );

    if (!character) {
      throw new CharacterNotFound();
    }

    return character;
  }
}
