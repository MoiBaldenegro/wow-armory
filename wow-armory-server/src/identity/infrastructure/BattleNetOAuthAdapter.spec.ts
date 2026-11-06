import { OAuthState } from '../domain/OAuthState';
import { BattleNetOAuthAdapter } from './BattleNetOAuthAdapter';

describe('BattleNetOAuthAdapter', () => {
  it('builds the Battle.net authorization URL without leaking the client secret', () => {
    const adapter = new BattleNetOAuthAdapter({
      clientId: 'test-client',
      clientSecret: 'super-secret',
      redirectUri: 'https://api.example.com/auth/callback',
    });

    const url = new URL(
      adapter.buildAuthorizationUrl(OAuthState.create('random-state')),
    );

    expect(url.origin).toBe('https://oauth.battle.net');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.example.com/auth/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('wow.profile');
    expect(url.searchParams.get('state')).toBe('random-state');
    expect(url.toString()).not.toContain('super-secret');
  });
});
