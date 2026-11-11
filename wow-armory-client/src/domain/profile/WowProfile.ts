import type { WowMode } from '../armory/Armory';
export interface WowProfileCharacter {
  name: string;
  realmSlug: string;
  realmName?: string;
  mode: WowMode;
  level?: number;
  playableClassId?: number;
  playableRaceId?: number;
}

export interface WowProfile {
  characters: WowProfileCharacter[];
}
