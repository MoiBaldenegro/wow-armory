export interface AchievementDto {
  id?: number;
  name: string;
  points?: number;
  completedAt?: string;
}

export interface GuildDto {
  name: string;
  realm?: string;
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
  guild?: GuildDto;
  achievements?: AchievementDto[];
}
