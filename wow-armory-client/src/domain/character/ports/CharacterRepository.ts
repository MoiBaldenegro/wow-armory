import type { Character } from '../Character';
import type { WowMode } from '../../armory/Armory';

export interface CharacterRepository {
  findByRealmAndName(
    realmSlug: string,
    characterName: string,
    mode?: WowMode,
  ): Promise<Character | null>;
}
