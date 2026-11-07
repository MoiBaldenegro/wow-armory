import { CharacterError } from './errors/CharacterError';

export class CharacterClass {
  private constructor(private readonly _value: string) {}

  static create(value: string): CharacterClass {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new CharacterError('The character class is invalid.');
    }

    return new CharacterClass(value);
  }

  get value(): string {
    return this._value;
  }
}
