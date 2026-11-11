import type {
  AuctionFaction,
  AuctionPrices,
  CharacterPvp,
  CharacterStatistics,
  CharacterTalents,
  GuildProfile,
  HunterPet,
  PvpLeaderboard,
  RealmSummary,
  WowMode,
} from '../../domain/armory/Armory';
import type { ArmoryRepository } from '../../domain/armory/ports/ArmoryRepository';
import {
  CharacterRateLimited,
  CharacterUnavailable,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import type { HttpClient } from './HttpClient';
import { HttpError } from './HttpError';

function segment(value: string): string {
  return encodeURIComponent(value);
}

function characterPath(realm: string, name: string, suffix: string, mode: WowMode) {
  return `/characters/${segment(realm)}/${segment(name)}/${suffix}?mode=${mode}`;
}

export class HttpArmoryRepository implements ArmoryRepository {
  constructor(private readonly http: HttpClient) {}

  getStatistics(realm: string, name: string, mode: WowMode) {
    return this.getOrNull<CharacterStatistics>(characterPath(realm, name, 'statistics', mode));
  }

  getTalents(realm: string, name: string, mode: WowMode) {
    return this.getOrNull<CharacterTalents>(characterPath(realm, name, 'talents', mode));
  }

  getPvp(realm: string, name: string, mode: WowMode) {
    return this.getOrNull<CharacterPvp>(characterPath(realm, name, 'pvp', mode));
  }

  async getHunterPets(realm: string, name: string, mode: WowMode): Promise<HunterPet[]> {
    const result = await this.getOrNull<{ pets?: HunterPet[] }>(
      characterPath(realm, name, 'hunter-pets', mode),
    );
    return Array.isArray(result?.pets) ? result.pets : [];
  }

  getGuild(realm: string, guildSlug: string, mode: WowMode) {
    return this.getOrNull<GuildProfile>(
      `/guilds/${segment(realm)}/${segment(guildSlug)}?mode=${mode}`,
    );
  }

  async listRealms(mode: WowMode): Promise<RealmSummary[]> {
    const result = await this.getOrNull<{ realms?: RealmSummary[] }>(`/realms?mode=${mode}`);
    return Array.isArray(result?.realms) ? result.realms : [];
  }

  getAuctionPrices(
    realm: string,
    itemIds: number[],
    faction: AuctionFaction,
    mode: WowMode,
  ) {
    const items = itemIds.join(',');
    return this.getOrNull<AuctionPrices>(
      `/auctions/${segment(realm)}/prices?items=${items}&faction=${faction}&mode=${mode}`,
    );
  }

  getPvpLeaderboard(bracket: string, mode: WowMode, region?: number) {
    const regionQuery = region !== undefined ? `&region=${region}` : '';
    return this.getOrNull<PvpLeaderboard>(
      `/leaderboards/pvp/${segment(bracket)}?mode=${mode}${regionQuery}`,
    );
  }

  private async getOrNull<T>(path: string): Promise<T | null> {
    try {
      return await this.http.get<T>(path);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 404) {
          return null;
        }

        if (error.status === 400) {
          throw new CharacterValidation();
        }

        if (error.status === 429) {
          throw new CharacterRateLimited(error.retryAfterSeconds);
        }
      }

      throw new CharacterUnavailable();
    }
  }
}
