export interface WowProfileCharacter {
  name: string;
  realmSlug: string;
  realmName?: string;
  mode: 'retail' | 'classic';
  level?: number;
  playableClassId?: number;
  playableRaceId?: number;
}

export interface WowProfile {
  characters: WowProfileCharacter[];
}
