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
} from '../Armory';

/**
 * Read-only access to the Blizzard data proxied by wow-armory-server. Methods
 * return `null` when the resource does not exist (HTTP 404).
 */
export interface ArmoryRepository {
  getStatistics(realm: string, name: string, mode: WowMode): Promise<CharacterStatistics | null>;
  getTalents(realm: string, name: string, mode: WowMode): Promise<CharacterTalents | null>;
  getPvp(realm: string, name: string, mode: WowMode): Promise<CharacterPvp | null>;
  getHunterPets(realm: string, name: string, mode: WowMode): Promise<HunterPet[]>;
  getGuild(realm: string, guildSlug: string, mode: WowMode): Promise<GuildProfile | null>;
  listRealms(mode: WowMode): Promise<RealmSummary[]>;
  getAuctionPrices(
    realm: string,
    itemIds: number[],
    faction: AuctionFaction,
    mode: WowMode,
  ): Promise<AuctionPrices | null>;
  getPvpLeaderboard(
    bracket: string,
    mode: WowMode,
    region?: number,
  ): Promise<PvpLeaderboard | null>;
}
