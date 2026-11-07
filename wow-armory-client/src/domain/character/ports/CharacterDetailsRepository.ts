import type { CharacterDetails } from '../CharacterDetails';

export interface CharacterDetailsRepository {
  getDetails(
    realmSlug: string,
    characterName: string,
    mode: 'retail' | 'classic',
  ): Promise<CharacterDetails>;
}
