import axios from 'axios';
import { BlizzardCache } from '../shared/infrastructure/blizzard/blizzard-cache';
import {
  createTestBlizzardClient,
  mockBlizzardRoutes,
} from '../shared/infrastructure/blizzard/testing';
import { BlizzardAuctionsAdapter } from './BlizzardAuctionsAdapter';
import { BlizzardLeaderboardsAdapter } from './BlizzardLeaderboardsAdapter';
import { BlizzardRealmsAdapter } from './BlizzardRealmsAdapter';
import { parseFaction, parseItemIds } from './GameDataController';

describe('Game data adapters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists realms sorted by name', async () => {
    mockBlizzardRoutes(axios, {
      '/data/wow/realm/index': {
        realms: [
          { name: 'Whitemane', slug: 'whitemane' },
          { name: 'Grobbulus', slug: 'grobbulus' },
          { name: '' },
        ],
      },
    });

    await expect(
      new BlizzardRealmsAdapter(createTestBlizzardClient()).listRealms(
        'classic',
      ),
    ).resolves.toEqual([
      { name: 'Grobbulus', slug: 'grobbulus' },
      { name: 'Whitemane', slug: 'whitemane' },
    ]);
  });

  it('computes the lowest per-unit buyout of the faction auction house', async () => {
    const get = mockBlizzardRoutes(axios, {
      '/data/wow/realm/grobbulus': {
        connected_realm: {
          href: 'https://us.api.blizzard.com/data/wow/connected-realm/4372?namespace=x',
        },
      },
      '/data/wow/connected-realm/4372/auctions/index': {
        auctions: [
          { id: 2, name: 'Alliance Auction House' },
          { id: 6, name: 'Horde Auction House' },
        ],
      },
      '/data/wow/connected-realm/4372/auctions/6': {
        auctions: [
          { item: { id: 19019 }, buyout: 10_000_000, quantity: 1 },
          { item: { id: 19019 }, buyout: 9_000_000, quantity: 1 },
          { item: { id: 2589 }, buyout: 2_000, quantity: 20 },
          { item: { id: 2589 }, bid: 5 },
        ],
      },
    });
    const client = createTestBlizzardClient('us');
    const adapter = new BlizzardAuctionsAdapter(
      client,
      new BlizzardRealmsAdapter(client),
      new BlizzardCache(),
    );

    const result = await adapter.getPrices(
      'grobbulus',
      [19019, 2589, 1],
      'horde',
      'classic',
    );

    expect(result).toEqual({
      realmSlug: 'grobbulus',
      connectedRealmId: 4372,
      auctionHouse: 'Horde Auction House',
      prices: {
        '19019': { minBuyout: 9_000_000, quantity: 2 },
        '2589': { minBuyout: 100, quantity: 20 },
      },
    });

    // The reduced snapshot is cached: a second lookup does not re-download.
    const calls = get.mock.calls.length;
    await adapter.getPrices('grobbulus', [19019], 'horde', 'classic');
    expect(get.mock.calls.length).toBe(calls);
  });

  it('loads the Classic leaderboard of the current season', async () => {
    mockBlizzardRoutes(axios, {
      '/data/wow/pvp-region/index': {
        pvp_regions: [
          {
            key: {
              href: 'https://us.api.blizzard.com/data/wow/pvp-region/1?x',
            },
          },
        ],
      },
      '/data/wow/pvp-region/1/pvp-season/index': {
        seasons: [{ id: 5 }, { id: 6 }],
      },
      '/data/wow/pvp-region/1/pvp-season/6/pvp-leaderboard/3v3': {
        entries: [
          {
            rank: 2,
            rating: 2400,
            character: { name: 'Second', realm: { slug: 'faerlina' } },
            faction: { type: 'HORDE' },
            season_match_statistics: { won: 40, lost: 10 },
          },
          { rank: 1, rating: 2500, character: { name: 'First' } },
        ],
      },
    });

    const board = await new BlizzardLeaderboardsAdapter(
      createTestBlizzardClient('us'),
      new BlizzardCache(),
    ).getLeaderboard('3v3', 'classic');

    expect(board).toMatchObject({
      bracket: '3v3',
      seasonId: 6,
      pvpRegionId: 1,
      pvpRegions: [1],
    });
    expect(board.entries.map((entry) => entry.name)).toEqual([
      'First',
      'Second',
    ]);
    expect(board.entries[1]).toMatchObject({
      realmSlug: 'faerlina',
      faction: 'HORDE',
      won: 40,
    });
  });

  it('loads the Retail leaderboard from the season index', async () => {
    mockBlizzardRoutes(axios, {
      '/data/wow/pvp-season/index': { current_season: { id: 40 } },
      '/data/wow/pvp-season/40/pvp-leaderboard/2v2': {
        entries: [{ rank: 1, rating: 3000, character: { name: 'Top' } }],
      },
    });

    const board = await new BlizzardLeaderboardsAdapter(
      createTestBlizzardClient('us'),
      new BlizzardCache(),
    ).getLeaderboard('2v2', 'retail');

    expect(board).toMatchObject({ seasonId: 40, pvpRegions: [] });
    expect(board.entries).toHaveLength(1);
  });
});

describe('GameDataController parsers', () => {
  it('parses item ids', () => {
    expect(parseItemIds('1, 2,2,3')).toEqual([1, 2, 3]);
    expect(() => parseItemIds('')).toThrow();
    expect(() => parseItemIds('1,abc')).toThrow();
    expect(() =>
      parseItemIds(Array.from({ length: 41 }, (_, i) => i).join(',')),
    ).toThrow();
  });

  it('parses factions', () => {
    expect(parseFaction('HORDE')).toBe('horde');
    expect(parseFaction(undefined)).toBe('neutral');
    expect(() => parseFaction('pirates')).toThrow();
  });
});
