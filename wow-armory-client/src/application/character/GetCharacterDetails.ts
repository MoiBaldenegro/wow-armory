import type { CharacterDetails } from '../../domain/character/CharacterDetails';
import type { CharacterDetailsRepository } from '../../domain/character/ports/CharacterDetailsRepository';
import type { WowMode } from '../../domain/armory/Armory';

export class GetCharacterDetails {
  constructor(private readonly repository: CharacterDetailsRepository) {}

  execute(
    realmSlug: string,
    characterName: string,
    mode: WowMode,
  ): Promise<CharacterDetails> {
    return this.repository.getDetails(realmSlug, characterName, mode);
  }
}
