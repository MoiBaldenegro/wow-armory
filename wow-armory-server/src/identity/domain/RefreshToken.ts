import { InvalidSessionError } from './errors/IdentityError';

export class RefreshToken {
  private constructor(private readonly _value: string) {}

  static create(value: string): RefreshToken {
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidSessionError('A refresh token is required.');
    }

    return new RefreshToken(value);
  }

  get value(): string {
    return this._value;
  }
}
