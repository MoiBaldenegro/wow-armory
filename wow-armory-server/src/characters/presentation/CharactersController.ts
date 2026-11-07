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
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
  CharacterNotFound,
  InvalidCharacterName,
  InvalidRealmSlug,
} from '../domain/errors/CharacterError';
import { RateLimit } from '../../shared/infrastructure/rate-limit/rate-limit';
import { CharacterDto, toCharacterDto } from './dto/character.dto';

@Controller('characters')
export class CharactersController {
  constructor(private readonly getCharacter: GetCharacterUseCase) {}

  @Get(':realmSlug/:characterName')
  @RateLimit('public')
  async findOne(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Query('mode') mode: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CharacterDto> {
    try {
      const selectedMode = mode === 'retail' ? 'retail' : 'classic';
      const character = await this.getCharacter.execute(
        realmSlug,
        characterName,
        selectedMode,
      );

      return toCharacterDto(character);
    } catch (error) {
      if (
        error instanceof InvalidRealmSlug ||
        error instanceof InvalidCharacterName
      ) {
        throw new BadRequestException('Invalid realm or character name.');
      }

      if (error instanceof CharacterNotFound) {
        throw new NotFoundException('Character not found.');
      }

      if (error instanceof BlizzardRateLimited) {
        if (error.retryAfterSeconds !== undefined) {
          response.setHeader('Retry-After', String(error.retryAfterSeconds));
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Character lookup rate limit exceeded.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (error instanceof BlizzardUnavailable) {
        throw new BadGatewayException(
          'Character data is temporarily unavailable.',
        );
      }

      throw error;
    }
  }
}
