import type { Achievement } from './Achievement';
import type { Guild } from './Guild';

export interface Character {
  name: string;
  realmSlug: string;
  level: number;
  characterClass: string;
  race: string;
  specialization?: string;
  itemLevel: number;
  achievementPoints: number;
  lastLogin?: Date;
  guild?: Guild;
  achievements?: Achievement[];
  /** `ALLIANCE`, `HORDE` or `NEUTRAL`. */
  faction?: string;
}
