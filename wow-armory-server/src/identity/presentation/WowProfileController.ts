import {
  Controller,
  Get,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { BattleNetWowProfileAdapter } from '../infrastructure/BattleNetWowProfileAdapter';

@Controller('profile/user')
export class WowProfileController {
  constructor(private readonly profile: BattleNetWowProfileAdapter) {}

  @Get('wow')
  async getProfile() {
    try {
      const profile = await this.profile.getProfile();

      if (!profile) {
        throw new UnauthorizedException('Battle.net session required.');
      }

      return profile;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Battle.net profile data is temporarily unavailable.',
      );
    }
  }
}
