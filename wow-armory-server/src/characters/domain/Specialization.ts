import { CharacterError } from './errors/CharacterError';

export class Specialization {
  private constructor(private readonly _value: string) {}

  static create(value: string): Specialization {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new CharacterError('The character specialization is invalid.');
    }

    return new Specialization(value);
  }

  get value(): string {
    return this._value;
  }
}
