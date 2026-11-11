import type { Character } from '../../domain/character/Character';
import {
  CharacterRateLimited,
  CharacterUnavailable,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { CharacterRepository } from '../../domain/character/ports/CharacterRepository';
import { CharacterMapper } from './CharacterMapper';
import type { CharacterDto } from './CharacterDto';
import { HttpError } from './HttpError';
import type { HttpClient } from './HttpClient';
import type { WowMode } from '../../domain/armory/Armory';

export class HttpCharacterRepository implements CharacterRepository {
  constructor(private readonly http: HttpClient) {}

  async findByRealmAndName(
    realmSlug: string,
    characterName: string,
    mode: WowMode = 'classic',
  ): Promise<Character | null> {
    // Classic is the server default; every other catalog is named explicitly.
    const modeQuery = mode === 'classic' ? '' : `?mode=${mode}`;
    const path = `/characters/${encodeURIComponent(
      realmSlug,
    )}/${encodeURIComponent(characterName)}${modeQuery}`;

    try {
      const dto = await this.http.get<CharacterDto>(path);
      return CharacterMapper.toDomain(dto);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 404) {
          return null;
        }

        if (error.status === 400) {
          throw new CharacterValidation('Invalid realm or character name.');
        }

        if (error.status === 429) {
          throw new CharacterRateLimited(error.retryAfterSeconds);
        }

        if (error.status === 0 || error.status >= 500) {
          throw new CharacterUnavailable();
        }
      }

      throw new CharacterUnavailable();
    }
  }
}
