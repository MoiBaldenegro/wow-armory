export interface Achievement {
  name: string;
  date: string;
  points: number;
  description: string;
}

export interface Guild {
  name: string;
  rank: string;
  memberCount: number;
  realm: string;
}

export interface CharacterStats {
  strength: number;
  agility: number;
  intellect: number;
  stamina: number;
  criticalStrike: number;
  haste: number;
  mastery: number;
  versatility: number;
}

export interface Character {
  name: string;
  level: number;
  class: string;
  race: string;
  spec: string;
  itemLevel: number;
  stats: CharacterStats;
  avatar: string;
  bannerImage: string;
  guild: Guild;
  recentAchievements: Achievement[];
  playTime: string;
  lastLogin: string;
}