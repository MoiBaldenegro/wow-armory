import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthService {
  public clientId = process.env.BLIZZARD_CLIENT_ID; // Reemplaza con tu Client ID
  public clientSecret = process.env.BLIZZARD_CLIENT_SECRET; // Reemplaza con tu Client Secret
  public redirectUri = process.env.BLIZZARD_REDIRECT_URI; // La URI de redirección que configuraste
  private tokenUri = 'https://oauth.battle.net/token'; // Para la región US
  private apiUrl = 'https://us.api.blizzard.com/profile/wow/character'; // Endpoint de Blizzard para obtener los datos del personaje

  // Intercambiar código por token de acceso
  async getAccessToken(code: string): Promise<any> {
    const response = await axios.post(this.tokenUri, null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      },
    });

    return response.data;
  }

  // Obtener los datos del personaje utilizando el token de acceso
  async getCharacterData(
    realmSlug: string,
    characterName: string,
    accessToken: string,
  ): Promise<any> {
    try {
      console.log('Haciendo request a la API de Blizzard...');
      console.log(
        `URL de Blizzard: ${this.apiUrl}/${realmSlug}/${characterName}`,
      );

      const response = await axios.get(
        `${this.apiUrl}/${realmSlug}/${characterName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`, // Usamos el token de acceso
          },
          params: {
            namespace: 'profile-classic-us', // Namespace para la región US
            locale: 'en_US', // Idioma
          },
        },
      );
      console.log('Respuesta de la API de Blizzard:', response.data); // Log de la respuesta
      return response.data; // Devuelve la información del personaje
    } catch (error) {
      console.error('Error al obtener los datos del personaje:', error);
      throw new Error('Error al obtener los datos del personaje');
    }
  }

  // Validar el token (opcional)
  async checkToken(token: string): Promise<any> {
    const response = await axios.get(
      'https://oauth.battle.net/oauth/check_token',
      {
        params: {
          token,
        },
      },
    );
    return response.data;
  }
}
