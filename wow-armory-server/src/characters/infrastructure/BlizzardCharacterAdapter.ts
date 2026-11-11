import axios from 'axios';
import { Achievement } from '../domain/Achievement';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';
import { Character } from '../domain/Character';
import { CharacterName } from '../domain/CharacterName';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
} from '../domain/errors/CharacterError';
import { CharacterRepository } from '../domain/ports/CharacterRepository';
import { RealmSlug } from '../domain/RealmSlug';
import {
  toBlizzardPathSegment,
  WowMode,
} from '../../shared/infrastructure/blizzard/blizzard-api-config';
import { BlizzardMapper } from './BlizzardMapper';

const PROFILE_PATH = '/profile/wow/character';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ACHIEVEMENT_ICONS = 12;

export interface BlizzardApiConfig {
  region: string;
  namespace: string;
  namespaces?: Partial<Record<WowMode, string>>;
  staticNamespaces?: Partial<Record<WowMode, string>>;
  locale?: string;
}

export class BlizzardCharacterAdapter implements CharacterRepository {
  constructor(
    private readonly tokenProvider: ApplicationTokenProvider,
    private readonly config: BlizzardApiConfig,
    private readonly mapper: BlizzardMapper = new BlizzardMapper(),
  ) {}

  async findByRealmAndName(
    realm: RealmSlug,
    name: CharacterName,
    mode: WowMode = 'classic',
  ): Promise<Character | null> {
    const token = await this.tokenProvider.getAccessToken();
    const url = `https://${this.config.region}.api.blizzard.com${PROFILE_PATH}/${toBlizzardPathSegment(realm.value)}/${toBlizzardPathSegment(name.value)}`;
    const params = {
      namespace: this.config.namespaces?.[mode] ?? this.config.namespace,
      locale: this.config.locale ?? 'en_US',
    };

    let character: Character;

    try {
      const [profile, achievements, valid] = await Promise.all([
        axios.get<unknown>(url, {
          headers: { Authorization: `Bearer ${token}` },
          params,
          timeout: REQUEST_TIMEOUT_MS,
        }),
        this.getRecentAchievements(`${url}/achievements`, token, params),
        this.isValid(`${url}/status`, token, params),
      ]);

      // A renamed, deleted or transferred character keeps answering for a
      // while; `/status` reports it as invalid.
      if (!valid) {
        return null;
      }

      character = this.mapper.toDomain(profile.data, realm);

      if (!character.achievements?.length && achievements.length > 0) {
        character = this.withAchievements(character, achievements);
      }
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

      if (error instanceof BlizzardUnavailable) {
        throw error;
      }

      throw new BlizzardUnavailable();
    }

    return this.enrichAchievementMedia(character, mode, token);
  }

  /**
   * The profile summary only links to achievements, so recent ones come from
   * the dedicated endpoint. It is best effort: failures leave the list empty.
   */
  private async getRecentAchievements(
    url: string,
    token: string,
    params: Record<string, string>,
  ): Promise<Achievement[]> {
    try {
      const response = await axios.get<unknown>(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: REQUEST_TIMEOUT_MS,
      });

      return this.mapper.toRecentAchievements(response.data);
    } catch {
      return [];
    }
  }

  /** Best effort: only an explicit `is_valid: false` invalidates. */
  private async isValid(
    url: string,
    token: string,
    params: Record<string, string>,
  ): Promise<boolean> {
    try {
      const response = await axios.get<unknown>(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: REQUEST_TIMEOUT_MS,
      });
      return (response.data as { is_valid?: unknown })?.is_valid !== false;
    } catch {
      return true;
    }
  }

  private async enrichAchievementMedia(
    character: Character,
    mode: WowMode,
    token: string,
  ): Promise<Character> {
    if (!character.achievements?.length) {
      return character;
    }

    const achievements = await Promise.all(
      character.achievements.map(async (achievement, index) => {
        const iconUrl =
          achievement.iconUrl ??
          (index >= MAX_ACHIEVEMENT_ICONS || achievement.id === undefined
            ? undefined
            : await this.getAchievementIcon(achievement.id, mode, token));

        return Achievement.create({
          id: achievement.id,
          name: achievement.name,
          points: achievement.points,
          completedAt: achievement.completedAt,
          iconUrl,
        });
      }),
    );

    return this.withAchievements(character, achievements);
  }

  private withAchievements(
    character: Character,
    achievements: Achievement[],
  ): Character {
    return Character.create({
      name: character.name,
      realmSlug: character.realmSlug,
      level: character.level,
      characterClass: character.characterClass,
      race: character.race,
      specialization: character.specialization,
      itemLevel: character.itemLevel,
      achievementPoints: character.achievementPoints,
      lastLogin: character.lastLogin,
      guild: character.guild,
      faction: character.faction,
      achievements,
    });
  }

  private async getAchievementIcon(
    achievementId: number,
    mode: WowMode,
    token: string,
  ): Promise<string | undefined> {
    try {
      const response = await axios.get<unknown>(
        `https://${this.config.region}.api.blizzard.com/data/wow/media/achievement/${achievementId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            namespace:
              this.config.staticNamespaces?.[mode] ??
              `static-${this.config.region}`,
            locale: this.config.locale ?? 'en_US',
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );
      const assets = (response.data as Record<string, unknown>)?.assets;
      const asset = Array.isArray(assets)
        ? (assets.find(
            (value) =>
              typeof (value as Record<string, unknown>)?.value === 'string',
          ) as Record<string, unknown> | undefined)
        : undefined;

      return typeof asset?.value === 'string' ? asset.value : undefined;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return undefined;
      }

      throw error;
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
