import { CharacterError } from './errors/CharacterError';

export class AchievementPoints {
  private constructor(private readonly _value: number) {}

  static create(value: number): AchievementPoints {
    if (!Number.isInteger(value) || value < 0) {
      throw new CharacterError(
        'The achievement points must be a non-negative integer.',
      );
    }

    return new AchievementPoints(value);
  }

  get value(): number {
    return this._value;
  }
}
