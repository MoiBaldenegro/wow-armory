import { Achievement } from './Achievement';
import { AchievementPoints } from './AchievementPoints';
import { CharacterClass } from './CharacterClass';
import { CharacterName } from './CharacterName';
import { Guild } from './Guild';
import { ItemLevel } from './ItemLevel';
import { Race } from './Race';
import { RealmSlug } from './RealmSlug';
import { Specialization } from './Specialization';

export interface CharacterProps {
  name: CharacterName;
  realmSlug: RealmSlug;
  level: number;
  characterClass: CharacterClass;
  race: Race;
  specialization?: Specialization;
  itemLevel: ItemLevel;
  achievementPoints: AchievementPoints;
  lastLogin?: Date;
  guild?: Guild;
  achievements?: Achievement[];
  /** `ALLIANCE`, `HORDE` or `NEUTRAL`. */
  faction?: string;
}

export class Character {
  private constructor(private readonly props: CharacterProps) {}

  static create(props: CharacterProps): Character {
    return new Character(props);
  }

  get name(): CharacterName {
    return this.props.name;
  }

  get realmSlug(): RealmSlug {
    return this.props.realmSlug;
  }

  get level(): number {
    return this.props.level;
  }

  get characterClass(): CharacterClass {
    return this.props.characterClass;
  }

  get race(): Race {
    return this.props.race;
  }

  get specialization(): Specialization | undefined {
    return this.props.specialization;
  }

  get itemLevel(): ItemLevel {
    return this.props.itemLevel;
  }

  get achievementPoints(): AchievementPoints {
    return this.props.achievementPoints;
  }

  get lastLogin(): Date | undefined {
    return this.props.lastLogin;
  }

  get faction(): string | undefined {
    return this.props.faction;
  }

  get guild(): Guild | undefined {
    return this.props.guild;
  }

  get achievements(): Achievement[] | undefined {
    return this.props.achievements;
  }
}
