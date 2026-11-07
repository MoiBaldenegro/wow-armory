import type { WowProfile } from '../../domain/profile/WowProfile';
import type { WowProfileRepository } from '../../domain/profile/ports/WowProfileRepository';
import type { HttpClient } from './HttpClient';

interface WowProfileDto {
  characters?: Array<{
    name: string;
    realmSlug: string;
    realmName?: string;
    level?: number;
    playableClassId?: number;
    playableRaceId?: number;
  }>;
}

export class HttpWowProfileRepository implements WowProfileRepository {
  constructor(private readonly http: HttpClient) {}

  async getProfile(): Promise<WowProfile> {
    const dto = await this.http.get<WowProfileDto>('/profile/user/wow');

    return {
      characters: Array.isArray(dto.characters) ? dto.characters : [],
    };
  }
}
