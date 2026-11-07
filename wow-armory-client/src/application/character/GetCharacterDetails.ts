import type { CharacterDetails } from '../../domain/character/CharacterDetails';
import type { CharacterDetailsRepository } from '../../domain/character/ports/CharacterDetailsRepository';

export class GetCharacterDetails {
  constructor(private readonly repository: CharacterDetailsRepository) {}

  execute(
    realmSlug: string,
    characterName: string,
    mode: 'retail' | 'classic',
  ): Promise<CharacterDetails> {
    return this.repository.getDetails(realmSlug, characterName, mode);
  }
}
