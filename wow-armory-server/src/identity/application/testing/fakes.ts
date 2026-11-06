import { AuthSession } from '../../domain/AuthSession';
import { OAuthState } from '../../domain/OAuthState';
import { RefreshToken } from '../../domain/RefreshToken';
import { OAuthProvider, OAuthTokenSet } from '../../domain/ports/OAuthProvider';
import { SessionRepository } from '../../domain/ports/SessionRepository';

export const DEFAULT_TOKEN_SET: OAuthTokenSet = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  battletag: 'Player#1234',
};

export class FakeOAuthProvider implements OAuthProvider {
  authorizationStates: string[] = [];
  exchangedCodes: string[] = [];
  refreshedTokens: string[] = [];
  exchangeResult: OAuthTokenSet | Error = { ...DEFAULT_TOKEN_SET };
  refreshResult: OAuthTokenSet | Error = {
    ...DEFAULT_TOKEN_SET,
    accessToken: 'refreshed-access-token',
    refreshToken: undefined,
  };

  buildAuthorizationUrl(state: OAuthState): string {
    this.authorizationStates.push(state.value);

    const params = new URLSearchParams({
      client_id: 'test-client',
      redirect_uri: 'http://localhost:3000/auth/callback',
      response_type: 'code',
      scope: 'wow.profile',
      state: state.value,
    });

    return `https://oauth.battle.net/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    this.exchangedCodes.push(code);

    if (this.exchangeResult instanceof Error) {
      throw this.exchangeResult;
    }

    return this.exchangeResult;
  }

  async refresh(refreshToken: RefreshToken): Promise<OAuthTokenSet> {
    this.refreshedTokens.push(refreshToken.value);

    if (this.refreshResult instanceof Error) {
      throw this.refreshResult;
    }

    return this.refreshResult;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private oauthState?: string;
  private session: AuthSession | null = null;

  regenerateCalls = 0;
  clearCalls = 0;
  saveCalls = 0;

  peekOAuthState(): string | undefined {
    return this.oauthState;
  }

  seedSession(session: AuthSession): void {
    this.session = session;
  }

  async saveOAuthState(state: string): Promise<void> {
    this.oauthState = state;
  }

  async consumeOAuthState(): Promise<string | undefined> {
    const state = this.oauthState;
    this.oauthState = undefined;
    return state;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  async save(session: AuthSession): Promise<void> {
    this.saveCalls += 1;
    this.session = session;
  }

  async regenerate(): Promise<void> {
    this.regenerateCalls += 1;
    this.session = null;
    this.oauthState = undefined;
  }

  async clear(): Promise<void> {
    this.clearCalls += 1;
    this.session = null;
    this.oauthState = undefined;
  }
}
