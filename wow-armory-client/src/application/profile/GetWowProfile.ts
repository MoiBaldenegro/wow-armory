import type { WowProfile } from '../../domain/profile/WowProfile';
import type { WowProfileRepository } from '../../domain/profile/ports/WowProfileRepository';

export class GetWowProfile {
  constructor(private readonly repository: WowProfileRepository) {}

  execute(): Promise<WowProfile> {
    return this.repository.getProfile();
  }
}
