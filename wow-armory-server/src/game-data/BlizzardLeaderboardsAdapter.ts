import { BlizzardUnavailable } from '../characters/domain/errors/CharacterError';
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
  RawRecord,
} from '../shared/infrastructure/blizzard/raw';

export interface LeaderboardEntry {
  rank: number;
  rating?: number;
  name: string;
  realmSlug?: string;
  faction?: string;
  won?: number;
  lost?: number;
}

export interface PvpLeaderboard {
  bracket: string;
  seasonId: number;
  pvpRegionId?: number;
  pvpRegions: number[];
  entries: LeaderboardEntry[];
}

export const LEADERBOARD_SIZE = 100;
export const PVP_BRACKETS = ['2v2', '3v3', '5v5', 'rbg'] as const;

/** Ids from `[{ id }]` or `[{ key: { href: .../pvp-region/{id} } }]` lists. */
function idsFrom(list: unknown, segment: string): number[] {
  return asArray(list)
    .map((value) => {
      const record = asRecord(value);
      const href = asString(asRecord(record?.key)?.href) ?? '';
      return (
        asNumber(record?.id) ??
        asNumber(new RegExp(`/${segment}/(\\d+)`).exec(href)?.[1])
      );
    })
    .filter((id): id is number => id !== undefined);
}

function firstList(record: RawRecord | undefined): unknown {
  return Object.values(record ?? {}).find(Array.isArray);
}

/**
 * Arena leaderboards for the current season. Retail exposes
 * `/pvp-season/{id}/pvp-leaderboard/{bracket}`; Classic nests seasons under a
 * PvP region (`/pvp-region/{id}/pvp-season/{id}/pvp-leaderboard/{bracket}`).
 */
export class BlizzardLeaderboardsAdapter {
  constructor(
    private readonly client: BlizzardApiClient,
    private readonly cache: BlizzardCache,
  ) {}

  /** Only the reduced top entries are cached, never the raw leaderboard. */
  getLeaderboard(
    bracket: string,
    mode: WowMode,
    requestedRegionId?: number,
  ): Promise<PvpLeaderboard> {
    return this.cache.getOrLoad(
      `leaderboard:${this.client.region}:${mode}:${bracket}:${requestedRegionId ?? ''}`,
      CACHE_TTL.leaderboard,
      () => this.loadLeaderboard(bracket, mode, requestedRegionId),
    );
  }

  private async loadLeaderboard(
    bracket: string,
    mode: WowMode,
    requestedRegionId?: number,
  ): Promise<PvpLeaderboard> {
    const options = {
      mode,
      namespace: 'dynamic' as const,
      ttlMs: CACHE_TTL.leaderboard,
    };
    const uncached = { ...options, ttlMs: 0 };

    if (mode === 'retail') {
      const seasonId = await this.currentSeason(
        '/data/wow/pvp-season/index',
        mode,
      );
      const data = await this.client.get<unknown>(
        `/data/wow/pvp-season/${seasonId}/pvp-leaderboard/${encodeURIComponent(bracket)}`,
        uncached,
      );
      return {
        bracket,
        seasonId,
        pvpRegions: [],
        entries: this.mapEntries(data),
      };
    }

    const regions = idsFrom(
      firstList(
        asRecord(
          await this.client.get<unknown>('/data/wow/pvp-region/index', options),
        ),
      ),
      'pvp-region',
    );
    const pvpRegionId =
      requestedRegionId !== undefined && regions.includes(requestedRegionId)
        ? requestedRegionId
        : regions[0];

    if (pvpRegionId === undefined) {
      throw new BlizzardUnavailable();
    }

    const base = `/data/wow/pvp-region/${pvpRegionId}/pvp-season`;
    const seasonId = await this.currentSeason(`${base}/index`, mode);
    const data = await this.client.get<unknown>(
      `${base}/${seasonId}/pvp-leaderboard/${encodeURIComponent(bracket)}`,
      uncached,
    );

    return {
      bracket,
      seasonId,
      pvpRegionId,
      pvpRegions: regions,
      entries: this.mapEntries(data),
    };
  }

  private async currentSeason(path: string, mode: WowMode): Promise<number> {
    const index = asRecord(
      await this.client.get<unknown>(path, {
        mode,
        namespace: 'dynamic',
        ttlMs: CACHE_TTL.leaderboard,
      }),
    );
    const current = asNumber(asRecord(index?.current_season)?.id);
    const seasons = idsFrom(index?.seasons, 'pvp-season');
    const seasonId =
      current ?? (seasons.length ? Math.max(...seasons) : undefined);

    if (seasonId === undefined) {
      throw new BlizzardUnavailable();
    }

    return seasonId;
  }

  private mapEntries(payload: unknown): LeaderboardEntry[] {
    return asArray(asRecord(payload)?.entries)
      .flatMap((value) => {
        const entry = asRecord(value);
        const character = asRecord(entry?.character);
        const name = asString(character?.name);
        const rank = asNumber(entry?.rank);
        const stats = asRecord(entry?.season_match_statistics);

        return name && rank !== undefined
          ? [
              {
                rank,
                rating: asNumber(entry?.rating),
                name,
                realmSlug: asString(asRecord(character?.realm)?.slug),
                faction: asString(asRecord(entry?.faction)?.type),
                won: asNumber(stats?.won),
                lost: asNumber(stats?.lost),
              },
            ]
          : [];
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, LEADERBOARD_SIZE);
  }
}
