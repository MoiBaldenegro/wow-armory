import type { WowProfile } from '../WowProfile';

export interface WowProfileRepository {
  getProfile(): Promise<WowProfile>;
}
