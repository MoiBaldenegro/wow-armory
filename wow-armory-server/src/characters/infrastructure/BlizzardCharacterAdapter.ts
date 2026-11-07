import axios from 'axios';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';
import { Character } from '../domain/Character';
import { CharacterName } from '../domain/CharacterName';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
} from '../domain/errors/CharacterError';
import { CharacterRepository } from '../domain/ports/CharacterRepository';
import { RealmSlug } from '../domain/RealmSlug';
import { BlizzardMapper } from './BlizzardMapper';

const PROFILE_PATH = '/profile/wow/character';
const REQUEST_TIMEOUT_MS = 10_000;

export interface BlizzardApiConfig {
  region: string;
  namespace: string;
  namespaces?: Partial<Record<'retail' | 'classic', string>>;
  locale?: string;
}

/**
 * Adapter for Blizzard's public character profile endpoint. Every transport or
 * upstream failure is translated into a domain error so the presentation layer
 * never sees raw payloads or HTTP details.
 */
export class BlizzardCharacterAdapter implements CharacterRepository {
  constructor(
    private readonly tokenProvider: ApplicationTokenProvider,
    private readonly config: BlizzardApiConfig,
    private readonly mapper: BlizzardMapper = new BlizzardMapper(),
  ) {}

  async findByRealmAndName(
    realm: RealmSlug,
    name: CharacterName,
    mode: 'retail' | 'classic' = 'classic',
  ): Promise<Character | null> {
    const token = await this.tokenProvider.getAccessToken();

    const url = `https://${this.config.region}.api.blizzard.com${PROFILE_PATH}/${encodeURIComponent(
      realm.value,
    )}/${encodeURIComponent(name.value)}`;

    try {
      const response = await axios.get<unknown>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          namespace: this.config.namespaces?.[mode] ?? this.config.namespace,
          locale: this.config.locale ?? 'en_US',
        },
        timeout: REQUEST_TIMEOUT_MS,
      });

      return this.mapper.toDomain(response.data, realm);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 404) {
          return null;
        }

        if (status === 429) {
          throw new BlizzardRateLimited(
            this.parseRetryAfter(
              error.response?.headers as Record<string, unknown> | undefined,
            ),
          );
        }
      }

      throw new BlizzardUnavailable();
    }
  }

  private parseRetryAfter(
    headers: Record<string, unknown> | undefined,
  ): number | undefined {
    if (!headers) {
      return undefined;
    }

    const rawValue = headers['retry-after'] ?? headers['Retry-After'];
    const parsed = Number(rawValue);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }
}
