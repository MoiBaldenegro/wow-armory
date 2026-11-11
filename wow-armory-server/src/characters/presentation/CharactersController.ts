import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GetCharacterUseCase } from '../application/GetCharacterUseCase';
import { CharacterName } from '../domain/CharacterName';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
  CharacterNotFound,
  InvalidCharacterName,
  InvalidRealmSlug,
} from '../domain/errors/CharacterError';
import { RealmSlug } from '../domain/RealmSlug';
import {
  BlizzardCharacterDetailsAdapter,
  CharacterDetails,
} from '../infrastructure/BlizzardCharacterDetailsAdapter';
import { parseWowMode } from '../../shared/infrastructure/blizzard/blizzard-api-config';
import { RateLimit } from '../../shared/infrastructure/rate-limit/rate-limit';
import { CharacterDto, toCharacterDto } from './dto/character.dto';

@Controller('characters')
export class CharactersController {
  constructor(
    private readonly getCharacter: GetCharacterUseCase,
    private readonly details: BlizzardCharacterDetailsAdapter,
  ) {}

  @Get(':realmSlug/:characterName/details')
  @RateLimit('public')
  async detailsForCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterDetails> {
    try {
      const realm = RealmSlug.create(realmSlug);
      const name = CharacterName.create(characterName);

      return await this.details.getDetails(
        realm.value,
        name.value,
        parseWowMode(mode),
      );
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

  private toHttpException(error: unknown, response: Response): unknown {
    if (
      error instanceof InvalidRealmSlug ||
      error instanceof InvalidCharacterName
    ) {
      return new BadRequestException('Invalid realm or character name.');
    }

    if (error instanceof CharacterNotFound) {
      return new NotFoundException('Character not found.');
    }

    if (error instanceof BlizzardRateLimited) {
      if (error.retryAfterSeconds !== undefined) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
      }

      return new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Character lookup rate limit exceeded.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (error instanceof BlizzardUnavailable) {
      return new BadGatewayException(
        'Character data is temporarily unavailable.',
      );
    }

    return error;
  }
}
