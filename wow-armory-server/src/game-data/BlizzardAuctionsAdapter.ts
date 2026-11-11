import {
  BlizzardApiClient,
  CACHE_TTL,
} from '../shared/infrastructure/blizzard/blizzard-api-client';
import { WowMode } from '../shared/infrastructure/blizzard/blizzard-api-config';
import { BlizzardCache } from '../shared/infrastructure/blizzard/blizzard-cache';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
} from '../shared/infrastructure/blizzard/raw';
import { BlizzardRealmsAdapter } from './BlizzardRealmsAdapter';

export type AuctionFaction = 'alliance' | 'horde' | 'neutral';

export interface AuctionPrice {
  /** Lowest buyout per unit, in copper. */
  minBuyout: number;
  /** Units listed across all auctions of the item. */
  quantity: number;
}

export interface AuctionPrices {
  realmSlug: string;
  connectedRealmId: number;
  auctionHouse?: string;
  prices: Record<string, AuctionPrice>;
}

interface PriceSnapshot {
  auctionHouse?: string;
  prices: Map<number, AuctionPrice>;
}

/** Auction snapshots are large (tens of MB); give them time to download. */
const AUCTIONS_TIMEOUT_MS = 45_000;

/**
 * Lowest buyout of items on a realm's auction house. Blizzard snapshots
 * refresh about hourly, so only the reduced `itemId → price` map is cached
 * (never the raw payload). Classic has one auction house per faction
 * (`auctions/index`); Retail has a single one per connected realm.
 */
export class BlizzardAuctionsAdapter {
  constructor(
    private readonly client: BlizzardApiClient,
    private readonly realms: BlizzardRealmsAdapter,
    private readonly cache: BlizzardCache,
  ) {}

  async getPrices(
    realmSlug: string,
    itemIds: number[],
    faction: AuctionFaction,
    mode: WowMode,
  ): Promise<AuctionPrices> {
    const connectedRealmId = await this.realms.getConnectedRealmId(
      realmSlug,
      mode,
    );
    const snapshot = await this.cache.getOrLoad(
      `auctions:${this.client.region}:${mode}:${connectedRealmId}:${faction}`,
      CACHE_TTL.auctions,
      () => this.loadSnapshot(connectedRealmId, faction, mode),
    );

    const prices: Record<string, AuctionPrice> = {};
    for (const id of itemIds) {
      const price = snapshot.prices.get(id);
      if (price) {
        prices[String(id)] = price;
      }
    }

    return {
      realmSlug,
      connectedRealmId,
      auctionHouse: snapshot.auctionHouse,
      prices,
    };
  }

  private async loadSnapshot(
    connectedRealmId: number,
    faction: AuctionFaction,
    mode: WowMode,
  ): Promise<PriceSnapshot> {
    const base = `/data/wow/connected-realm/${connectedRealmId}/auctions`;

    if (mode === 'retail') {
      return {
        prices: this.reduce(
          await this.client.get<unknown>(base, {
            mode,
            namespace: 'dynamic',
            ttlMs: 0,
            timeoutMs: AUCTIONS_TIMEOUT_MS,
          }),
        ),
      };
    }

    const index = asRecord(
      await this.client.get<unknown>(`${base}/index`, {
        mode,
        namespace: 'dynamic',
        ttlMs: CACHE_TTL.realms,
      }),
    );
    const houses = asArray(index?.auctions).flatMap((value) => {
      const house = asRecord(value);
      const id = asNumber(house?.id);
      const name = asString(house?.name);
      return id !== undefined ? [{ id, name }] : [];
    });
    const house =
      houses.find((item) => item.name?.toLowerCase().includes(faction)) ??
      houses[0];

    if (!house) {
      return { prices: new Map() };
    }

    return {
      auctionHouse: house.name,
      prices: this.reduce(
        await this.client.get<unknown>(`${base}/${house.id}`, {
          mode,
          namespace: 'dynamic',
          ttlMs: 0,
          timeoutMs: AUCTIONS_TIMEOUT_MS,
        }),
      ),
    };
  }

  private reduce(payload: unknown): Map<number, AuctionPrice> {
    const prices = new Map<number, AuctionPrice>();

    for (const value of asArray(asRecord(payload)?.auctions)) {
      const auction = asRecord(value);
      const itemId = asNumber(asRecord(auction?.item)?.id);
      const quantity = asNumber(auction?.quantity) ?? 1;
      const unitPrice = asNumber(auction?.unit_price);
      const buyout = asNumber(auction?.buyout);
      // `unit_price` (commodities) is per unit; `buyout` is per stack.
      const perUnit =
        unitPrice ??
        (buyout !== undefined
          ? Math.round(buyout / Math.max(quantity, 1))
          : undefined);

      if (itemId === undefined || perUnit === undefined || perUnit <= 0) {
        continue;
      }

      const current = prices.get(itemId);

      prices.set(itemId, {
        minBuyout: current ? Math.min(current.minBuyout, perUnit) : perUnit,
        quantity: (current?.quantity ?? 0) + quantity,
      });
    }

    return prices;
  }
}
