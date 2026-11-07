import { CharacterError } from './errors/CharacterError';

export class ItemLevel {
  private constructor(private readonly _value: number) {}

  static create(value: number): ItemLevel {
    if (!Number.isInteger(value) || value < 0) {
      throw new CharacterError(
        'The item level must be a non-negative integer.',
      );
    }

    return new ItemLevel(value);
  }

  get value(): number {
    return this._value;
  }
}
