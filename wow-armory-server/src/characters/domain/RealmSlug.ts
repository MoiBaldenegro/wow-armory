import { InvalidRealmSlug } from './errors/CharacterError';

const REALM_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

/**
 * Blizzard realm slug. Only lowercase ASCII letters, digits and hyphens are
 * accepted so path traversal tricks or encoded separators never reach the
 * upstream API.
 */
export class RealmSlug {
  private constructor(private readonly _value: string) {}

  static create(value: string): RealmSlug {
    if (typeof value !== 'string' || !REALM_SLUG_PATTERN.test(value)) {
      throw new InvalidRealmSlug();
    }

    return new RealmSlug(value);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
