import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RealmSlug } from '../characters/domain/RealmSlug';
import { parseWowMode } from '../shared/infrastructure/blizzard/blizzard-api-config';
import {
  InvalidRequestParameter,
  toBlizzardHttpException,
} from '../shared/infrastructure/http/blizzard-http-errors';
import { RateLimit } from '../shared/infrastructure/rate-limit/rate-limit';
import {
  AuctionFaction,
  AuctionPrices,
  BlizzardAuctionsAdapter,
} from './BlizzardAuctionsAdapter';
import {
  BlizzardLeaderboardsAdapter,
  PVP_BRACKETS,
  PvpLeaderboard,
} from './BlizzardLeaderboardsAdapter';
import { BlizzardRealmsAdapter, RealmSummary } from './BlizzardRealmsAdapter';

export const MAX_AUCTION_ITEMS = 40;
const FACTIONS: AuctionFaction[] = ['alliance', 'horde', 'neutral'];

export function parseItemIds(value: string | undefined): number[] {
  const ids = (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    ids.length === 0 ||
    ids.length > MAX_AUCTION_ITEMS ||
    ids.some((id) => !/^\d{1,9}$/.test(id))
  ) {
    throw new InvalidRequestParameter();
  }

  return [...new Set(ids.map(Number))];
}

export function parseFaction(value: string | undefined): AuctionFaction {
  const faction = (value ?? 'neutral').toLowerCase() as AuctionFaction;

  if (!FACTIONS.includes(faction)) {
    throw new InvalidRequestParameter();
  }

  return faction;
}

@Controller()
export class GameDataController {
  constructor(
    private readonly realms: BlizzardRealmsAdapter,
    private readonly auctions: BlizzardAuctionsAdapter,
    private readonly leaderboards: BlizzardLeaderboardsAdapter,
  ) {}

  @Get('realms')
  @RateLimit('public')
  async listRealms(
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ realms: RealmSummary[] }> {
    try {
      return { realms: await this.realms.listRealms(parseWowMode(mode)) };
    } catch (error) {
      throw toBlizzardHttpException(error, response);
    }
  }

  @Get('auctions/:realmSlug/prices')
  @RateLimit('public')
  async auctionPrices(
    @Param('realmSlug') realmSlug: string,
    @Query('items') items: string | undefined,
    @Query('faction') faction: string | undefined,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuctionPrices> {
    try {
      return await this.auctions.getPrices(
        RealmSlug.create(realmSlug).value,
        parseItemIds(items),
        parseFaction(faction),
        parseWowMode(mode),
      );
    } catch (error) {
      throw toBlizzardHttpException(error, response);
    }
  }

  @Get('leaderboards/pvp/:bracket')
  @RateLimit('public')
  async pvpLeaderboard(
    @Param('bracket') bracket: string,
    @Query('mode') mode: string | undefined,
    @Query('region') region: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PvpLeaderboard> {
    try {
      if (!(PVP_BRACKETS as readonly string[]).includes(bracket)) {
        throw new InvalidRequestParameter();
      }

      const regionId =
        region !== undefined && /^\d{1,4}$/.test(region)
          ? Number(region)
          : undefined;

      return await this.leaderboards.getLeaderboard(
        bracket,
        parseWowMode(mode),
        regionId,
      );
    } catch (error) {
      throw toBlizzardHttpException(error, response);
    }
  }
}
