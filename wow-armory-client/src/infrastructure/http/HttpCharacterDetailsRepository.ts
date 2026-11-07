import type { CharacterDetails } from '../../domain/character/CharacterDetails';
import type { CharacterDetailsRepository } from '../../domain/character/ports/CharacterDetailsRepository';
import type { HttpClient } from './HttpClient';

export class HttpCharacterDetailsRepository
  implements CharacterDetailsRepository
{
  constructor(private readonly http: HttpClient) {}

  getDetails(
    realmSlug: string,
    characterName: string,
    mode: 'retail' | 'classic',
  ): Promise<CharacterDetails> {
    return this.http.get<CharacterDetails>(
      `/characters/${encodeURIComponent(realmSlug)}/${encodeURIComponent(
        characterName,
      )}/details?mode=${mode}`,
    );
  }
}
