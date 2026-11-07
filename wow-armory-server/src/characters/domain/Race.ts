import { CharacterError } from './errors/CharacterError';

export class Race {
  private constructor(private readonly _value: string) {}

  static create(value: string): Race {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new CharacterError('The character race is invalid.');
    }

    return new Race(value);
  }

  get value(): string {
    return this._value;
  }
}
