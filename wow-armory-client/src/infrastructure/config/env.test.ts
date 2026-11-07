import { describe, expect, it } from 'vitest';
import { DEFAULT_SERVER_URI, resolveServerUri } from './env';

describe('resolveServerUri', () => {
  it('uses a valid configured URL in production', () => {
    expect(
      resolveServerUri({
        serverUri: 'https://api.example.com/',
        isProduction: true,
      }),
    ).toBe('https://api.example.com');
  });

  it('falls back to localhost in development', () => {
    expect(
      resolveServerUri({ serverUri: undefined, isProduction: false }),
    ).toBe(DEFAULT_SERVER_URI);
  });

  it('falls back to localhost for invalid development URLs', () => {
    expect(
      resolveServerUri({ serverUri: 'not-a-url', isProduction: false }),
    ).toBe(DEFAULT_SERVER_URI);
  });

  it('throws in production when the URL is missing', () => {
    expect(() =>
      resolveServerUri({ serverUri: undefined, isProduction: true }),
    ).toThrow(/required in production/);
  });

  it('throws in production when the URL is not http(s)', () => {
    expect(() =>
      resolveServerUri({ serverUri: 'ftp://example.com', isProduction: true }),
    ).toThrow(/valid http\(s\) URL/);
  });
});
