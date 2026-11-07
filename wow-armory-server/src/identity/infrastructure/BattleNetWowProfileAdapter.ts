import axios from 'axios';
import { TokenProvider } from '../domain/ports/TokenProvider';

type RawRecord = Record<string, unknown>;

export interface WowProfileCharacter {
  name: string;
  realmSlug: string;
  realmName?: string;
  level?: number;
  playableClassId?: number;
  playableRaceId?: number;
}

export interface WowProfile {
  characters: WowProfileCharacter[];
}

function record(value: unknown): RawRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RawRecord)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export class BattleNetWowProfileAdapter {
  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly region: string,
    private readonly locale: string,
  ) {}

  async getProfile(): Promise<WowProfile | null> {
    const token = await this.tokenProvider.getValidAccessToken();

    if (!token) {
      return null;
    }

    const response = await axios.get<unknown>(
      `https://${this.region}.api.blizzard.com/profile/user/wow`,
      {
        headers: { Authorization: `Bearer ${token.value}` },
        params: {
          namespace: `profile-${this.region}`,
          locale: this.locale,
        },
        timeout: 10_000,
      },
    );

    return this.mapProfile(response.data);
  }

  private mapProfile(payload: unknown): WowProfile {
    const root = record(payload);
    const accounts = Array.isArray(root?.wow_accounts) ? root.wow_accounts : [];
    const characters: WowProfileCharacter[] = [];

    for (const account of accounts) {
      const accountRecord = record(account);
      const accountCharacters = Array.isArray(accountRecord?.characters)
        ? accountRecord.characters
        : [];

      for (const value of accountCharacters) {
        const character = record(value);
        const name = stringValue(character?.name);
        const realm = record(character?.realm);
        const realmSlug = stringValue(realm?.slug);

        if (!name || !realmSlug) {
          continue;
        }

        characters.push({
          name,
          realmSlug,
          realmName: stringValue(realm?.name),
          level: numberValue(character?.level),
          playableClassId: numberValue(record(character?.playable_class)?.id),
          playableRaceId: numberValue(record(character?.playable_race)?.id),
        });
      }
    }

    return { characters };
  }
}
