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

  it('rejects plain http URLs in production for non-loopback hosts', () => {
    expect(() =>
      resolveServerUri({
        serverUri: 'http://api.example.com',
        isProduction: true,
      }),
    ).toThrow(/must use https:\/\/ in production/);
  });

  it('does not treat hosts that merely start with localhost as loopback', () => {
    expect(() =>
      resolveServerUri({
        serverUri: 'http://localhost.example.com',
        isProduction: true,
      }),
    ).toThrow(/must use https:\/\/ in production/);
  });

  it('allows http for localhost and 127.0.0.1 in production', () => {
    expect(
      resolveServerUri({
        serverUri: 'http://localhost:3000/',
        isProduction: true,
      }),
    ).toBe('http://localhost:3000');
    expect(
      resolveServerUri({
        serverUri: 'http://127.0.0.1:3000',
        isProduction: true,
      }),
    ).toBe('http://127.0.0.1:3000');
  });

  it('keeps accepting http URLs outside production', () => {
    expect(
      resolveServerUri({
        serverUri: 'http://api.example.com',
        isProduction: false,
      }),
    ).toBe('http://api.example.com');
  });
});
