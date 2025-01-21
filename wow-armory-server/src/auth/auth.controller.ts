import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  Param,
  Headers,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login(@Res() res: Response) {
    // Genera un valor aleatorio para el estado
    const state = randomBytes(16).toString('hex');

    // Almacena el valor 'state' en una cookie
    res.cookie('state', state, { httpOnly: true, secure: false }); // secure: true para producción

    // Redirige al usuario a Battle.net con el estado
    const authorizeUrl = `https://oauth.battle.net/authorize?client_id=${this.authService.clientId}&redirect_uri=${this.authService.redirectUri}&response_type=code&scope=wow.profile&state=${state}`;
    return res.redirect(authorizeUrl);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    // Recupera el estado almacenado en la cookie
    const cookieState = req.cookies['state'];

    // Verifica si el estado recibido en la URL es el mismo que el almacenado
    if (cookieState !== state) {
      return res.status(400).send('Estado no válido');
    }

    // Intercambia el código de autorización por el token
    const tokenData = await this.authService.getAccessToken(code);

    // Almacena el token en una cookie
    res.cookie('accessToken', tokenData.access_token, {
      httpOnly: true,
      secure: false, // Cambiar a true en producción
    });

    // Devuelve una respuesta de éxito
    return res.send('Autenticación completada. Token almacenado en cookies.');
  }

  @Get('character/:realmSlug/:characterName')
  async getCharacter(
    @Param('realmSlug') realmSlug: string,
    @Param('characterName') characterName: string,
    @Headers('Authorization') authorization: string, // Cambiar para obtener el token desde los encabezados
    @Res() res: Response,
  ): Promise<any> {
    // Lee el token de los encabezados (Authorization)
    const accessToken = authorization ? authorization.split(' ')[1] : null;
    console.log('Token de acceso:', accessToken);

    if (!accessToken) {
      return res
        .status(401)
        .send('Token de acceso no encontrado. Inicia sesión nuevamente.');
    }

    try {
      // Obtiene los datos del personaje usando el token
      const characterData = await this.authService.getCharacterData(
        realmSlug,
        characterName,
        accessToken,
      );
      return res.json(characterData);
    } catch (error) {
      console.error('Error al obtener datos del personaje:', error);
      return res.status(500).send('Error al obtener datos del personaje.');
    }
  }
}