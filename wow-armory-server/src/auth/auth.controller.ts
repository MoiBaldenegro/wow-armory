import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

/**
 * Legacy character endpoint. It stays in the auth module until the character
 * bounded context lands (job 007); all authentication routes live in
 * `identity/presentation/AuthController`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('character/:realmSlug/:characterName')
  async getCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!req.session.accessToken) {
      throw new UnauthorizedException(
        'Sesión no válida. Por favor inicie sesión nuevamente.',
      );
    }

    try {
      const characterData = await this.authService.getCharacterData(
        realmSlug,
        characterName,
        req.session.accessToken,
      );
      res.json(characterData);
    } catch {
      res.status(500).json({
        message: 'Error al obtener datos del personaje',
        statusCode: 500,
      });
    }
  }
}
