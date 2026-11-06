import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Fetches a character from Blizzard using the user access token kept in the
   * server-side session. This method is migrated to the character context in
   * job 007.
   */
  async getCharacterData(
    realmSlug: string,
    characterName: string,
    accessToken: string,
  ): Promise<unknown> {
    const region = this.config.get<string>('BLIZZARD_REGION', 'us');
    const namespace = this.config.get<string>(
      'BLIZZARD_NAMESPACE',
      'profile-classic-us',
    );

    try {
      const response = await axios.get<unknown>(
        `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            namespace,
            locale: 'en_US',
          },
        },
      );

      return response.data;
    } catch {
      throw new Error('Error al obtener los datos del personaje');
    }
  }
}
