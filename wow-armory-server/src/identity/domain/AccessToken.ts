import { InvalidSessionError } from './errors/IdentityError';

export class AccessToken {
  private constructor(private readonly _value: string) {}

  static create(value: string): AccessToken {
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidSessionError('An access token is required.');
    }

    return new AccessToken(value);
  }

  get value(): string {
    return this._value;
  }
}
