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
import type { CharacterEquipmentItem } from '../../domain/character/CharacterDetails';

/** Maximum item ids per auction lookup (the server accepts up to 40). */
export const MAX_AUCTION_ITEMS = 40;

/**
 * Blizzard guild slug: lowercase, apostrophes removed, whitespace as hyphens.
 * "Knight's Order" → "knights-order".
 */
export function toGuildSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-');
}

export function toAuctionFaction(faction?: string): AuctionFaction {
  const value = faction?.toLowerCase();
  return value === 'alliance' || value === 'horde' ? value : 'neutral';
}

/** Unique, tradeable item ids of an equipment list. */
export function auctionItemIds(equipment: CharacterEquipmentItem[]): number[] {
  return [
    ...new Set(
      equipment
        .map((item) => item.itemId)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    ),
  ].slice(0, MAX_AUCTION_ITEMS);
}

/** Application facade for the armory read models. */
export class ArmoryQueries {
  constructor(private readonly repository: ArmoryRepository) {}

  statistics(realm: string, name: string, mode: WowMode): Promise<CharacterStatistics | null> {
    return this.repository.getStatistics(realm, name, mode);
  }

  talents(realm: string, name: string, mode: WowMode): Promise<CharacterTalents | null> {
    return this.repository.getTalents(realm, name, mode);
  }

  pvp(realm: string, name: string, mode: WowMode): Promise<CharacterPvp | null> {
    return this.repository.getPvp(realm, name, mode);
  }

  hunterPets(realm: string, name: string, mode: WowMode): Promise<HunterPet[]> {
    return this.repository.getHunterPets(realm, name, mode);
  }

  guild(realm: string, guildSlug: string, mode: WowMode): Promise<GuildProfile | null> {
    return this.repository.getGuild(realm, toGuildSlug(guildSlug), mode);
  }

  realms(mode: WowMode): Promise<RealmSummary[]> {
    return this.repository.listRealms(mode);
  }

  async auctionPrices(
    realm: string,
    equipment: CharacterEquipmentItem[],
    faction: string | undefined,
    mode: WowMode,
  ): Promise<AuctionPrices | null> {
    const ids = auctionItemIds(equipment);
    return ids.length === 0
      ? null
      : this.repository.getAuctionPrices(realm, ids, toAuctionFaction(faction), mode);
  }

  pvpLeaderboard(bracket: string, mode: WowMode, region?: number): Promise<PvpLeaderboard | null> {
    return this.repository.getPvpLeaderboard(bracket, mode, region);
  }
}
