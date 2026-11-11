import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetCharacterUseCase } from '../application/GetCharacterUseCase';
import { CharacterName } from '../domain/CharacterName';
import { RealmSlug } from '../domain/RealmSlug';
import {
  BlizzardCharacterDetailsAdapter,
  CharacterDetails,
} from '../infrastructure/BlizzardCharacterDetailsAdapter';
import { parseWowMode } from '../../shared/infrastructure/blizzard/blizzard-api-config';
import { RateLimit } from '../../shared/infrastructure/rate-limit/rate-limit';
import { toBlizzardHttpException } from '../../shared/infrastructure/http/blizzard-http-errors';
import {
  BlizzardCharacterExtrasAdapter,
  CharacterPvp,
  CharacterStatistics,
  CharacterTalents,
  HunterPet,
} from '../infrastructure/BlizzardCharacterExtrasAdapter';
import { CharacterDto, toCharacterDto } from './dto/character.dto';

@Controller('characters')
export class CharactersController {
  constructor(
    private readonly getCharacter: GetCharacterUseCase,
    private readonly details: BlizzardCharacterDetailsAdapter,
    private readonly extras: BlizzardCharacterExtrasAdapter,
  ) {}

  @Get(':realmSlug/:characterName/statistics')
  @RateLimit('public')
  async statistics(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterStatistics> {
    try {
      const { realm, name } = this.validate(realmSlug, characterName);
      return await this.extras.getStatistics(realm, name, parseWowMode(mode));
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  @Get(':realmSlug/:characterName/talents')
  @RateLimit('public')
  async talents(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterTalents> {
    try {
      const { realm, name } = this.validate(realmSlug, characterName);
      return await this.extras.getTalents(realm, name, parseWowMode(mode));
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  @Get(':realmSlug/:characterName/pvp')
  @RateLimit('public')
  async pvp(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterPvp> {
    try {
      const { realm, name } = this.validate(realmSlug, characterName);
      return await this.extras.getPvp(realm, name, parseWowMode(mode));
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  @Get(':realmSlug/:characterName/hunter-pets')
  @RateLimit('public')
  async hunterPets(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ pets: HunterPet[] }> {
    try {
      const { realm, name } = this.validate(realmSlug, characterName);
      return {
        pets: await this.extras.getHunterPets(realm, name, parseWowMode(mode)),
      };
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  @Get(':realmSlug/:characterName/details')
  @RateLimit('public')
  async detailsForCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterDetails> {
    try {
      const { realm, name } = this.validate(realmSlug, characterName);
      return await this.details.getDetails(realm, name, parseWowMode(mode));
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  @Get(':realmSlug/:characterName')
  @RateLimit('public')
  async findOne(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterDto> {
    try {
      const character = await this.getCharacter.execute(
        realmSlug,
        characterName,
        parseWowMode(mode),
      );

      return toCharacterDto(character);
    } catch (error) {
      throw this.toHttpException(error, response);
    }
  }

  private validate(realmSlug: string, characterName: string) {
    return {
      realm: RealmSlug.create(realmSlug).value,
      name: CharacterName.create(characterName).value,
    };
  }

  private toHttpException(error: unknown, response: Response): unknown {
    return toBlizzardHttpException(error, response);
  }
}
