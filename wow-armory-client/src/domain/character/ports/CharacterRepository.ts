import type { Character } from '../Character';

export interface CharacterRepository {
  findByRealmAndName(
    realmSlug: string,
    characterName: string,
  ): Promise<Character | null>;
}
