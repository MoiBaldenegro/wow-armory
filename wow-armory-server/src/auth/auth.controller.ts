import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login(@Req() req: Request, @Res() res: Response) {
    const state = randomBytes(16).toString('hex');

    req.session.oauth_state = state;
    const authorizeUrl = `https://oauth.battle.net/authorize?client_id=${
      this.authService.clientId
    }&redirect_uri=${
      this.authService.redirectUri
    }&response_type=code&scope=wow.profile&state=${state}`;

    // En lugar de redirect, devolvemos la URL
    res.json({ url: authorizeUrl });
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!req.session.oauth_state || req.session.oauth_state !== state) {
      return res.redirect(
        'https://wow-armory.pages.dev/error?message=invalid_state',
      );
    }

    try {
      const tokenData = await this.authService.getAccessToken(code);
      req.session.access_token = tokenData.access_token;

      return res.redirect('https://wow-armory.pages.dev/profile');
    } catch (error) {
      console.error('Error en callback:', error);
      return res.redirect(
        'https://wow-armory.pages.dev/error?message=auth_failed',
      );
    }
  }

  @Get('session-check')
  checkSession(@Req() req: Request) {
    return {
      authenticated: !!req.session.access_token,
      statusCode: 200,
    };
  }

  @Get('character/:realmSlug/:characterName')
  async getCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    // Verificar si hay un token en la sesión
    if (!req.session.access_token) {
      throw new UnauthorizedException(
        'Sesión no válida. Por favor inicie sesión nuevamente.',
      );
    }

    try {
      // Usar el token de la sesión para obtener los datos
      const characterData = await this.authService.getCharacterData(
        realmSlug,
        characterName,
        req.session.access_token,
      );
      return res.json(characterData);
    } catch (error) {
      console.error('Error al obtener datos del personaje:', error);
      return res.status(500).json({
        message: 'Error al obtener datos del personaje',
        error: error.message,
        statusCode: 500,
      });
    }
  }

  // Opcional: Agregar un endpoint para cerrar sesión
  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({
          message: 'Error al cerrar sesión',
          statusCode: 500,
        });
      }

      return res.json({
        message: 'Sesión cerrada exitosamente',
        statusCode: 200,
      });
    });
  }
}
