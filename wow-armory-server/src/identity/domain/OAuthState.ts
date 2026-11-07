import { randomBytes, timingSafeEqual } from 'crypto';

const STATE_BYTES = 32;

export class OAuthState {
  private constructor(private readonly _value: string) {}

  static create(value: string): OAuthState {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error('The OAuth state must be a non-empty string.');
    }

    return new OAuthState(value);
  }

  static generate(): OAuthState {
    return new OAuthState(randomBytes(STATE_BYTES).toString('hex'));
  }

  static matches(expected: string, received: string): boolean {
    if (typeof expected !== 'string' || typeof received !== 'string') {
      return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  get value(): string {
    return this._value;
  }
}
