import { describe, expect, it } from 'vitest';
import { InMemoryArmoryRepository } from '../../test/fakes';
import {
  ArmoryQueries,
  auctionItemIds,
  MAX_AUCTION_ITEMS,
  toAuctionFaction,
  toGuildSlug,
} from './ArmoryQueries';

describe('ArmoryQueries helpers', () => {
  it('builds Blizzard guild slugs', () => {
    expect(toGuildSlug("  Knight's Order ")).toBe('knights-order');
    expect(toGuildSlug('Los  Ñandúes')).toBe('los-ñandúes');
  });

  it('maps factions to auction houses', () => {
    expect(toAuctionFaction('HORDE')).toBe('horde');
    expect(toAuctionFaction('ALLIANCE')).toBe('alliance');
    expect(toAuctionFaction(undefined)).toBe('neutral');
  });

  it('collects unique positive item ids up to the limit', () => {
    const equipment = [
      { slot: 'Head', name: 'A', itemId: 1 },
      { slot: 'Neck', name: 'B', itemId: 1 },
      { slot: 'Back', name: 'C' },
      ...Array.from({ length: 50 }, (_, i) => ({ slot: `S${i}`, name: `N${i}`, itemId: i + 2 })),
    ];
    const ids = auctionItemIds(equipment);
    expect(ids[0]).toBe(1);
    expect(ids).toHaveLength(MAX_AUCTION_ITEMS);
  });

  it('skips the auction lookup without item ids and slugifies guild names', async () => {
    const repository = new InMemoryArmoryRepository();
    const queries = new ArmoryQueries(repository);

    await expect(queries.auctionPrices('grobbulus', [], 'HORDE', 'classic')).resolves.toBeNull();
    await queries.guild('grobbulus', 'The Horde', 'classic');

    expect(repository.calls).toEqual(['guild:classic:grobbulus:the-horde']);
  });
});
