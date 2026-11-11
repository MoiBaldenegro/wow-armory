export type WowMode = 'retail' | 'classic';

export type StatGroup =
  | 'general'
  | 'attributes'
  | 'offense'
  | 'defense'
  | 'resistances';

export interface CharacterStatValue {
  key: string;
  group: StatGroup;
  value: number;
  kind: 'number' | 'percent';
}

export interface CharacterStatistics {
  powerType?: string;
  stats: CharacterStatValue[];
}

export interface TalentEntry {
  name: string;
  rank?: number;
  description?: string;
}

export interface TalentTree {
  name: string;
  points?: number;
  talents: TalentEntry[];
}

export interface TalentGroup {
  name?: string;
  active: boolean;
  trees: TalentTree[];
}

export interface CharacterTalents {
  activeSpecialization?: string;
  groups: TalentGroup[];
}

export interface PvpMatchStats {
  played: number;
  won: number;
  lost: number;
}

export interface PvpBracket {
  bracket: string;
  rating?: number;
  season?: PvpMatchStats;
  weekly?: PvpMatchStats;
}

export interface CharacterPvp {
  honorableKills?: number;
  honorLevel?: number;
  brackets: PvpBracket[];
}

export interface HunterPet {
  name: string;
  level?: number;
  creature?: string;
  active: boolean;
  summoned: boolean;
  slot?: number;
  imageUrl?: string;
}

export interface GuildCrest {
  emblemUrl?: string;
  borderUrl?: string;
  emblemColor?: string;
  borderColor?: string;
  backgroundColor?: string;
}

export interface GuildMember {
  name: string;
  realmSlug?: string;
  level?: number;
  classId?: number;
  raceId?: number;
  rank?: number;
}

export interface GuildActivity {
  type: string;
  characterName?: string;
  achievementName?: string;
  encounterName?: string;
  timestamp?: string;
}

export interface GuildProfile {
  name: string;
  slug: string;
  realmName?: string;
  realmSlug: string;
  faction?: string;
  memberCount?: number;
  achievementPoints?: number;
  createdAt?: string;
  crest?: GuildCrest;
  members: GuildMember[];
  activity: GuildActivity[];
  recentAchievements: Array<{ name: string; completedAt?: string }>;
}

export interface RealmSummary {
  name: string;
  slug: string;
}

export type AuctionFaction = 'alliance' | 'horde' | 'neutral';

export interface AuctionPrice {
  /** Lowest buyout per unit, in copper. */
  minBuyout: number;
  quantity: number;
}

export interface AuctionPrices {
  realmSlug: string;
  auctionHouse?: string;
  prices: Record<string, AuctionPrice>;
}

export const PVP_BRACKETS = ['2v2', '3v3', '5v5', 'rbg'] as const;
export type PvpBracketKey = (typeof PVP_BRACKETS)[number];

export interface LeaderboardEntry {
  rank: number;
  rating?: number;
  name: string;
  realmSlug?: string;
  faction?: string;
  won?: number;
  lost?: number;
}

export interface PvpLeaderboard {
  bracket: string;
  seasonId: number;
  pvpRegionId?: number;
  pvpRegions: number[];
  entries: LeaderboardEntry[];
}
