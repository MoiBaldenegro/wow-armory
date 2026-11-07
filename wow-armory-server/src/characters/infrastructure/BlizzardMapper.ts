import { Achievement } from '../domain/Achievement';
import { AchievementPoints } from '../domain/AchievementPoints';
import { Character } from '../domain/Character';
import { CharacterClass } from '../domain/CharacterClass';
import { CharacterName } from '../domain/CharacterName';
import { BlizzardUnavailable } from '../domain/errors/CharacterError';
import { Guild } from '../domain/Guild';
import { ItemLevel } from '../domain/ItemLevel';
import { Race } from '../domain/Race';
import { RealmSlug } from '../domain/RealmSlug';
import { Specialization } from '../domain/Specialization';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as RawRecord;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asInteger(value: unknown): number | undefined {
  const parsed = asNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

function asNonNegativeInteger(value: unknown): number | undefined {
  const parsed = asInteger(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

/**
 * Blizzard returns timestamps as epoch milliseconds.
 */
function asDate(value: unknown): Date | undefined {
  const timestamp = asNumber(value);

  if (timestamp === undefined || timestamp <= 0) {
    return undefined;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Anti-corruption layer between Blizzard's JSON payloads and the character
 * domain. It intentionally knows nothing about Nest, Axios or the raw payload
 * shape once mapping finishes.
 */
export class BlizzardMapper {
  toDomain(payload: unknown, realmSlug: RealmSlug): Character {
    const data = asRecord(payload);

    if (!data) {
      throw new BlizzardUnavailable();
    }

    const name = asString(data.name);
    const level = asNonNegativeInteger(data.level);
    const characterClassName = asString(asRecord(data.character_class)?.name);
    const raceName = asString(asRecord(data.race)?.name);

    if (!name || level === undefined || !characterClassName || !raceName) {
      throw new BlizzardUnavailable();
    }

    try {
      return Character.create({
        name: CharacterName.create(name),
        realmSlug,
        level,
        characterClass: CharacterClass.create(characterClassName),
        race: Race.create(raceName),
        specialization: this.mapSpecialization(data.active_spec),
        itemLevel: ItemLevel.create(
          asNonNegativeInteger(data.equipped_item_level) ??
            asNonNegativeInteger(data.average_item_level) ??
            0,
        ),
        achievementPoints: AchievementPoints.create(
          asNonNegativeInteger(data.achievement_points) ?? 0,
        ),
        lastLogin: asDate(data.last_login_timestamp),
        guild: this.mapGuild(data.guild),
        achievements: this.mapAchievements(data.achievements),
      });
    } catch (error) {
      if (error instanceof BlizzardUnavailable) {
        throw error;
      }

      throw new BlizzardUnavailable();
    }
  }

  private mapSpecialization(value: unknown): Specialization | undefined {
    const name = asString(asRecord(value)?.name);
    return name ? Specialization.create(name) : undefined;
  }

  private mapGuild(value: unknown): Guild | undefined {
    const guild = asRecord(value);
    const name = asString(guild?.name);

    if (!guild || !name) {
      return undefined;
    }

    const realm = asString(asRecord(guild.realm)?.name);

    return Guild.create({
      name,
      realm,
      rank: asNonNegativeInteger(guild.rank),
      memberCount: asNonNegativeInteger(guild.member_count),
    });
  }

  private mapAchievements(value: unknown): Achievement[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const achievements = value
      .map((item) => this.mapAchievement(item))
      .filter((item): item is Achievement => item !== undefined);

    return achievements.length > 0 ? achievements : undefined;
  }

  private mapAchievement(value: unknown): Achievement | undefined {
    const record = asRecord(value);

    if (!record) {
      return undefined;
    }

    const nested = asRecord(record.achievement);
    const name = asString(record.name) ?? asString(nested?.name);

    if (!name) {
      return undefined;
    }

    return Achievement.create({
      id: asNonNegativeInteger(record.id) ?? asNonNegativeInteger(nested?.id),
      name,
      points:
        asNonNegativeInteger(record.points) ??
        asNonNegativeInteger(nested?.points),
      completedAt: asDate(record.completed_timestamp ?? record.completed_at),
    });
  }
}
