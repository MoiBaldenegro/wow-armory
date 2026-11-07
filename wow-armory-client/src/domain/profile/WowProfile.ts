export interface WowProfileCharacter {
  name: string;
  realmSlug: string;
  realmName?: string;
  level?: number;
  playableClassId?: number;
  playableRaceId?: number;
}

export interface WowProfile {
  characters: WowProfileCharacter[];
}
