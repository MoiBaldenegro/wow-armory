import { CharacterError } from './errors/CharacterError';

export interface AchievementProps {
  id?: number;
  name: string;
  points?: number;
  completedAt?: Date;
  iconUrl?: string;
}

export class Achievement {
  private constructor(private readonly props: AchievementProps) {}

  static create(props: AchievementProps): Achievement {
    if (typeof props.name !== 'string' || props.name.trim().length === 0) {
      throw new CharacterError('The achievement name is invalid.');
    }

    return new Achievement({
      id: props.id,
      name: props.name,
      points: props.points,
      completedAt: props.completedAt,
      iconUrl: props.iconUrl,
    });
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get points(): number | undefined {
    return this.props.points;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get iconUrl(): string | undefined {
    return this.props.iconUrl;
  }
}
