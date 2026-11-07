import { InvalidCharacterName } from './errors/CharacterError';

const CHARACTER_NAME_PATTERN = /^[A-Za-z0-9'-]{1,64}$/;

/**
 * Character name as exposed by the public HTTP contract. The regex is
 * intentionally ASCII-only and rejects separators, percent escapes, spaces and
 * dot-dot sequences before any upstream request is made.
 */
export class CharacterName {
  private constructor(private readonly _value: string) {}

  static create(value: string): CharacterName {
    if (typeof value !== 'string' || !CHARACTER_NAME_PATTERN.test(value)) {
      throw new InvalidCharacterName();
    }

    return new CharacterName(value);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
