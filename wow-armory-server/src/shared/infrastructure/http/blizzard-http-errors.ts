import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  BlizzardRateLimited,
  BlizzardResourceNotFound,
  BlizzardUnavailable,
  CharacterNotFound,
  InvalidCharacterName,
  InvalidRealmSlug,
} from '../../../characters/domain/errors/CharacterError';

export class InvalidRequestParameter extends Error {}

/**
 * Translates domain and upstream errors into the HTTP contract shared by every
 * Blizzard-backed controller. Unknown errors are returned unchanged so Nest
 * answers 500 and logs them.
 */
export function toBlizzardHttpException(
  error: unknown,
  response: Response,
): unknown {
  if (
    error instanceof InvalidRealmSlug ||
    error instanceof InvalidCharacterName ||
    error instanceof InvalidRequestParameter
  ) {
    return new BadRequestException('Invalid request parameters.');
  }

  if (error instanceof CharacterNotFound) {
    return new NotFoundException('Character not found.');
  }

  if (error instanceof BlizzardResourceNotFound) {
    return new NotFoundException('Resource not found.');
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
