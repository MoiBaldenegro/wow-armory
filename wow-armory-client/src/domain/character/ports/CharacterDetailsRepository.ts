import type { CharacterDetails } from '../CharacterDetails';
import type { WowMode } from '../../armory/Armory';

export interface CharacterDetailsRepository {
  getDetails(
    realmSlug: string,
    characterName: string,
    mode: WowMode,
  ): Promise<CharacterDetails>;
}
