import type { Character } from '../Character';

export interface CharacterRepository {
  findByRealmAndName(
    realmSlug: string,
    characterName: string,
    mode?: 'retail' | 'classic',
  ): Promise<Character | null>;
}
