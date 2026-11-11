export interface AchievementDto {
  id?: number;
  name: string;
  points?: number;
  completedAt?: string;
  iconUrl?: string;
}

export interface GuildDto {
  name: string;
  realm?: string;
  realmSlug?: string;
  rank?: number;
  memberCount?: number;
}

export interface CharacterDto {
  name: string;
  realmSlug: string;
  level: number;
  class: string;
  race: string;
  spec?: string;
  itemLevel: number;
  achievementPoints: number;
  lastLogin?: string;
  faction?: string;
  guild?: GuildDto;
  achievements?: AchievementDto[];
}
