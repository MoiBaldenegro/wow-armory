import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('fails in production when SESSION_SECRET is missing', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        BLIZZARD_CLIENT_ID: 'client-id',
        BLIZZARD_CLIENT_SECRET: 'client-secret',
        BLIZZARD_REDIRECT_URI: 'https://api.example.com/auth/callback',
      }),
    ).toThrow(/SESSION_SECRET/);
  });

  it('fails in production when Battle.net credentials are missing', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        SESSION_SECRET: 'a-production-secret',
      }),
    ).toThrow(/BLIZZARD_CLIENT_ID/);
  });

  it('generates an ephemeral development secret with a warning', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    const config = validateEnv({ NODE_ENV: 'development' });

    expect(typeof config.SESSION_SECRET).toBe('string');
    expect((config.SESSION_SECRET as string).length).toBeGreaterThanOrEqual(64);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ephemeral development secret'),
    );

    warn.mockRestore();
  });

  it('applies the documented defaults', () => {
    const config = validateEnv({
      NODE_ENV: 'development',
      SESSION_SECRET: 'a-development-secret',
    });

    expect(config.BLIZZARD_REGION).toBe('us');
    expect(config.BLIZZARD_NAMESPACE).toBe('profile-classic-us');
    expect(config.CLIENT_URL).toBe('http://localhost:5173');
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
    expect(config.COOKIE_SECURE).toBe(false);
    expect(config.COOKIE_SAME_SITE).toBe('lax');
    expect(config.PORT).toBe(3000);
  });
});
