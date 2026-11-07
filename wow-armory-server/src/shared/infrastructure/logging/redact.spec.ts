import { REDACTED, redact } from './redact';

describe('redact', () => {
  it('replaces every sensitive key regardless of case', () => {
    const result = redact({
      token: 'a',
      AccessToken: 'b',
      refresh_token_unrelated: 'kept',
      refreshToken: 'c',
      SECRET: 'd',
      password: 'e',
      Authorization: 'f',
      cookie: 'g',
      code: 'h',
      State: 'i',
      method: 'GET',
      statusCode: 200,
    });

    expect(result).toEqual({
      token: REDACTED,
      AccessToken: REDACTED,
      refresh_token_unrelated: 'kept',
      refreshToken: REDACTED,
      SECRET: REDACTED,
      password: REDACTED,
      Authorization: REDACTED,
      cookie: REDACTED,
      code: REDACTED,
      State: REDACTED,
      method: 'GET',
      statusCode: 200,
    });
  });

  it('redacts nested objects and arrays without mutating the input', () => {
    const input = {
      session: { accessToken: 'secret-access', battletag: 'Player#1234' },
      items: [{ password: 'pw' }, 'plain'],
    };

    const result = redact(input);

    expect(result).toEqual({
      session: { accessToken: REDACTED, battletag: 'Player#1234' },
      items: [{ password: REDACTED }, 'plain'],
    });
    expect(input.session.accessToken).toBe('secret-access');
  });

  it('handles primitives and circular references', () => {
    expect(redact('text')).toBe('text');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();

    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    expect(redact(circular)).toEqual({ name: 'loop', self: '[Truncated]' });
  });
});
