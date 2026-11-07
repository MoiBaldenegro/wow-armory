import { Character } from '../../domain/Character';
import { CharacterClass } from '../../domain/CharacterClass';
import { CharacterName } from '../../domain/CharacterName';
import { CharacterRepository } from '../../domain/ports/CharacterRepository';
import { AchievementPoints } from '../../domain/AchievementPoints';
import { Guild } from '../../domain/Guild';
import { ItemLevel } from '../../domain/ItemLevel';
import { Race } from '../../domain/Race';
import { RealmSlug } from '../../domain/RealmSlug';
import { Specialization } from '../../domain/Specialization';
import { Achievement } from '../../domain/Achievement';

export interface CharacterFixtureOverrides {
  name?: string;
  realmSlug?: string;
  level?: number;
  characterClass?: string;
  race?: string;
  specialization?: string;
  itemLevel?: number;
  achievementPoints?: number;
  lastLogin?: Date;
  guild?: Guild;
  achievements?: Achievement[];
}

export function buildCharacter(
  overrides: CharacterFixtureOverrides = {},
): Character {
  return Character.create({
    name: CharacterName.create(overrides.name ?? 'Billiemoi'),
    realmSlug: RealmSlug.create(overrides.realmSlug ?? 'grobbulus'),
    level: overrides.level ?? 60,
    characterClass: CharacterClass.create(
      overrides.characterClass ?? 'Warrior',
    ),
    race: Race.create(overrides.race ?? 'Orc'),
    specialization: overrides.specialization
      ? Specialization.create(overrides.specialization)
      : undefined,
    itemLevel: ItemLevel.create(overrides.itemLevel ?? 245),
    achievementPoints: AchievementPoints.create(
      overrides.achievementPoints ?? 12345,
    ),
    lastLogin: overrides.lastLogin,
    guild: overrides.guild,
    achievements: overrides.achievements,
  });
}

export class FakeCharacterRepository implements CharacterRepository {
  calls: Array<{ realm: string; name: string }> = [];
  result: Character | Error | null = null;

  async findByRealmAndName(
    realm: RealmSlug,
    name: CharacterName,
  ): Promise<Character | null> {
    this.calls.push({ realm: realm.value, name: name.value });

    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }

  reset(): void {
    this.calls = [];
    this.result = null;
  }
}
