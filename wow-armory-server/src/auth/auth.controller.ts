import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  Param,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login(@Res() res: Response, @Session() session: Record<string, any>) {
    const state = randomBytes(16).toString('hex');
    
    // Almacena el estado en la sesión del servidor en lugar de una cookie
    session.oauth_state = state;

    const authorizeUrl = `https://oauth.battle.net/authorize?client_id=${this.authService.clientId}&redirect_uri=${this.authService.redirectUri}&response_type=code&scope=wow.profile&state=${state}`;
    return res.redirect(authorizeUrl);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ): Promise<any> {
    // Verifica el estado usando la sesión
    if (session.oauth_state !== state) {
      throw new UnauthorizedException('Estado no válido');
    }

    // Limpia el estado de la sesión
    delete session.oauth_state;

    // Obtiene el token y lo almacena en la sesión del servidor
    const tokenData = await this.authService.getAccessToken(code);
    session.access_token = tokenData.access_token;

    return res.send('Autenticación completada exitosamente.');
  }

  @Get('character/:realmSlug/:characterName')
  async getCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ): Promise<any> {
    // Verifica el token desde la sesión del servidor
    const accessToken = session.access_token;

    if (!accessToken) {
      throw new UnauthorizedException('Sesión no válida. Por favor inicie sesión nuevamente.');
    }

    try {
      const characterData = await this.authService.getCharacterData(
        realmSlug,
        characterName,
        accessToken,
      );
      return res.json(characterData);
    } catch (error) {
      console.error('Error al obtener datos del personaje:', error);
      throw new Error('Error al obtener datos del personaje.');
    }
  }
}