import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RealmSlug } from '../characters/domain/RealmSlug';
import { parseWowMode } from '../shared/infrastructure/blizzard/blizzard-api-config';
import {
  InvalidRequestParameter,
  toBlizzardHttpException,
} from '../shared/infrastructure/http/blizzard-http-errors';
import { RateLimit } from '../shared/infrastructure/rate-limit/rate-limit';
import { BlizzardGuildAdapter, GuildProfile } from './BlizzardGuildAdapter';

/** Blizzard guild slugs: lowercase letters, digits and hyphens. */
export const GUILD_SLUG_PATTERN = /^[\p{L}\p{M}0-9-]{1,96}$/u;

@Controller('guilds')
export class GuildsController {
  constructor(private readonly guilds: BlizzardGuildAdapter) {}

  @Get(':realmSlug/:guildSlug')
  @RateLimit('public')
  async findOne(
    @Param('realmSlug') realmSlug: string,
    @Param('guildSlug') guildSlug: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GuildProfile> {
    try {
      const realm = RealmSlug.create(realmSlug).value;
      const slug = guildSlug.toLocaleLowerCase('en-US');

      if (!GUILD_SLUG_PATTERN.test(slug)) {
        throw new InvalidRequestParameter();
      }

      return await this.guilds.getGuild(realm, slug, parseWowMode(mode));
    } catch (error) {
      throw toBlizzardHttpException(error, response);
    }
  }
}
