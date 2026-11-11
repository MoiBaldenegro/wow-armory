import { Character } from '../../domain/Character';

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

export function toCharacterDto(character: Character): CharacterDto {
  const dto: CharacterDto = {
    name: character.name.value,
    realmSlug: character.realmSlug.value,
    level: character.level,
    class: character.characterClass.value,
    race: character.race.value,
    itemLevel: character.itemLevel.value,
    achievementPoints: character.achievementPoints.value,
  };

  if (character.specialization) {
    dto.spec = character.specialization.value;
  }

  if (character.lastLogin) {
    dto.lastLogin = character.lastLogin.toISOString();
  }

  if (character.faction) {
    dto.faction = character.faction;
  }

  if (character.guild) {
    dto.guild = {
      name: character.guild.name,
      realm: character.guild.realm,
      realmSlug: character.guild.realmSlug,
      rank: character.guild.rank,
      memberCount: character.guild.memberCount,
    };
  }

  if (character.achievements) {
    dto.achievements = character.achievements.map((achievement) => ({
      id: achievement.id,
      name: achievement.name,
      points: achievement.points,
      completedAt: achievement.completedAt?.toISOString(),
      iconUrl: achievement.iconUrl,
    }));
  }

  return dto;
}
