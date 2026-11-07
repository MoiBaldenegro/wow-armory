import type { Achievement } from '../../domain/character/Achievement';
import type { Character } from '../../domain/character/Character';
import type { Guild } from '../../domain/character/Guild';
import type { AchievementDto, CharacterDto, GuildDto } from './CharacterDto';

function toDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toGuild(dto: GuildDto): Guild {
  const guild: Guild = { name: dto.name };

  if (dto.realm !== undefined) {
    guild.realm = dto.realm;
  }

  if (dto.rank !== undefined) {
    guild.rank = dto.rank;
  }

  if (dto.memberCount !== undefined) {
    guild.memberCount = dto.memberCount;
  }

  return guild;
}

function toAchievement(dto: AchievementDto): Achievement {
  const achievement: Achievement = { name: dto.name };

  if (dto.id !== undefined) {
    achievement.id = dto.id;
  }

  if (dto.points !== undefined) {
    achievement.points = dto.points;
  }

  const completedAt = toDate(dto.completedAt);

  if (completedAt !== undefined) {
    achievement.completedAt = completedAt;
  }

  if (dto.iconUrl !== undefined) {
    achievement.iconUrl = dto.iconUrl;
  }

  return achievement;
}

export class CharacterMapper {
  static toDomain(dto: CharacterDto): Character {
    const character: Character = {
      name: dto.name,
      realmSlug: dto.realmSlug,
      level: dto.level,
      characterClass: dto.class,
      race: dto.race,
      itemLevel: dto.itemLevel,
      achievementPoints: dto.achievementPoints,
    };

    if (dto.spec !== undefined) {
      character.specialization = dto.spec;
    }

    const lastLogin = toDate(dto.lastLogin);

    if (lastLogin !== undefined) {
      character.lastLogin = lastLogin;
    }

    if (dto.guild !== undefined) {
      character.guild = toGuild(dto.guild);
    }

    if (dto.achievements !== undefined) {
      character.achievements = dto.achievements.map(toAchievement);
    }

    return character;
  }
}
