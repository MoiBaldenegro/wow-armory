import { BlizzardRateLimited } from '../characters/domain/errors/CharacterError';
import {
  BlizzardApiClient,
  CACHE_TTL,
  pickAsset,
} from '../shared/infrastructure/blizzard/blizzard-api-client';
import {
  toBlizzardPathSegment,
  WowMode,
} from '../shared/infrastructure/blizzard/blizzard-api-config';
import {
  asArray,
  asIsoDate,
  asNumber,
  asRecord,
  asString,
  RawRecord,
} from '../shared/infrastructure/blizzard/raw';

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

export interface GuildAchievement {
  name: string;
  completedAt?: string;
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
  recentAchievements: GuildAchievement[];
}

const MAX_ACTIVITY = 20;
const MAX_ACHIEVEMENTS = 10;

function rgba(value: unknown): string | undefined {
  const color = asRecord(asRecord(value)?.rgba);
  const r = asNumber(color?.r);
  const g = asNumber(color?.g);
  const b = asNumber(color?.b);
  const a = asNumber(color?.a) ?? 1;

  return r === undefined || g === undefined || b === undefined
    ? undefined
    : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Guild summary, roster, activity and achievements. Blizzard documents the
 * guild endpoints under the profile namespace for both Classic and Retail.
 */
export class BlizzardGuildAdapter {
  constructor(private readonly client: BlizzardApiClient) {}

  async getGuild(
    realmSlug: string,
    guildSlug: string,
    mode: WowMode,
  ): Promise<GuildProfile> {
    const base = `/data/wow/guild/${toBlizzardPathSegment(realmSlug)}/${toBlizzardPathSegment(guildSlug)}`;
    const options = {
      mode,
      namespace: 'profile' as const,
      ttlMs: CACHE_TTL.guild,
    };

    // The summary is required; a missing guild is a 404 for the caller.
    const summary = asRecord(await this.client.get<unknown>(base, options));

    const [roster, activity, achievements, crest] = await Promise.all([
      this.optional(this.client.get<unknown>(`${base}/roster`, options)),
      this.optional(this.client.get<unknown>(`${base}/activity`, options)),
      this.optional(this.client.get<unknown>(`${base}/achievements`, options)),
      this.mapCrest(asRecord(summary?.crest), mode),
    ]);

    return {
      name: asString(summary?.name) ?? guildSlug,
      slug: guildSlug,
      realmName: asString(asRecord(summary?.realm)?.name),
      realmSlug: asString(asRecord(summary?.realm)?.slug) ?? realmSlug,
      faction: asString(asRecord(summary?.faction)?.type),
      memberCount: asNumber(summary?.member_count),
      achievementPoints: asNumber(summary?.achievement_points),
      createdAt: asIsoDate(summary?.created_timestamp),
      crest,
      members: this.mapMembers(asRecord(roster)),
      activity: this.mapActivity(asRecord(activity)),
      recentAchievements: this.mapAchievements(asRecord(achievements)),
    };
  }

  /** Sub-resources are best effort, but rate limits still propagate. */
  private async optional(request: Promise<unknown>): Promise<unknown> {
    try {
      return await request;
    } catch (error) {
      if (error instanceof BlizzardRateLimited) {
        throw error;
      }
      return undefined;
    }
  }

  private async mapCrest(
    crest: RawRecord | undefined,
    mode: WowMode,
  ): Promise<GuildCrest | undefined> {
    if (!crest) {
      return undefined;
    }

    const emblem = asRecord(crest.emblem);
    const border = asRecord(crest.border);
    const [emblemUrl, borderUrl] = await Promise.all([
      this.crestMedia('emblem', asNumber(emblem?.id), mode),
      this.crestMedia('border', asNumber(border?.id), mode),
    ]);

    return {
      emblemUrl,
      borderUrl,
      emblemColor: rgba(emblem?.color),
      borderColor: rgba(border?.color),
      backgroundColor: rgba(asRecord(crest.background)?.color),
    };
  }

  private async crestMedia(
    kind: 'emblem' | 'border',
    id: number | undefined,
    mode: WowMode,
  ): Promise<string | undefined> {
    if (id === undefined) {
      return undefined;
    }

    try {
      return pickAsset(
        await this.client.get<unknown>(
          `/data/wow/media/guild-crest/${kind}/${id}`,
          {
            mode,
            namespace: 'static',
            ttlMs: CACHE_TTL.media,
          },
        ),
        ['image'],
      );
    } catch {
      return undefined;
    }
  }

  private mapMembers(roster: RawRecord | undefined): GuildMember[] {
    return asArray(roster?.members)
      .flatMap((value) => {
        const member = asRecord(value);
        const character = asRecord(member?.character);
        const name = asString(character?.name);

        return name
          ? [
              {
                name,
                realmSlug: asString(asRecord(character?.realm)?.slug),
                level: asNumber(character?.level),
                classId: asNumber(asRecord(character?.playable_class)?.id),
                raceId: asNumber(asRecord(character?.playable_race)?.id),
                rank: asNumber(member?.rank),
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          (a.rank ?? 99) - (b.rank ?? 99) ||
          (b.level ?? 0) - (a.level ?? 0) ||
          a.name.localeCompare(b.name),
      );
  }

  private mapActivity(activity: RawRecord | undefined): GuildActivity[] {
    return asArray(activity?.activities)
      .flatMap((value) => {
        const entry = asRecord(value);
        const achievement = asRecord(entry?.character_achievement);
        const encounter = asRecord(entry?.encounter_completed);
        const type =
          asString(asRecord(entry?.activity)?.type) ??
          (achievement
            ? 'CHARACTER_ACHIEVEMENT'
            : encounter
              ? 'ENCOUNTER'
              : undefined);

        if (!type) {
          return [];
        }

        return [
          {
            type,
            characterName: asString(asRecord(achievement?.character)?.name),
            achievementName: asString(asRecord(achievement?.achievement)?.name),
            encounterName: asString(asRecord(encounter?.encounter)?.name),
            timestamp: asIsoDate(entry?.timestamp),
          },
        ];
      })
      .slice(0, MAX_ACTIVITY);
  }

  private mapAchievements(data: RawRecord | undefined): GuildAchievement[] {
    return asArray(data?.recent_events)
      .flatMap((value) => {
        const event = asRecord(value);
        const name = asString(asRecord(event?.achievement)?.name);
        return name ? [{ name, completedAt: asIsoDate(event?.timestamp) }] : [];
      })
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, MAX_ACHIEVEMENTS);
  }
}
