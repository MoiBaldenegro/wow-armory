import { AuthSession } from '../domain/AuthSession';
import { OAuthState } from '../domain/OAuthState';
import { OAuthProvider } from '../domain/ports/OAuthProvider';
import { SessionRepository } from '../domain/ports/SessionRepository';

export type LoginErrorCode = 'invalid_state' | 'access_denied' | 'auth_failed';

export interface CompleteLoginInput {
  code?: string;
  state?: string;
  error?: string;
}

export interface CompleteLoginResult {
  ok: boolean;
  error?: LoginErrorCode;
}

export class CompleteLogin {
  constructor(
    private readonly oauthProvider: OAuthProvider,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(input: CompleteLoginInput): Promise<CompleteLoginResult> {
    // The state is single-use: consume it before any validation so a failed
    // attempt cannot be replayed as well.
    const expectedState = await this.sessionRepository.consumeOAuthState();

    if (input.error) {
      return { ok: false, error: 'access_denied' };
    }

    if (
      !input.state ||
      !expectedState ||
      !OAuthState.matches(expectedState, input.state)
    ) {
      return { ok: false, error: 'invalid_state' };
    }

    if (!input.code) {
      return { ok: false, error: 'auth_failed' };
    }

    let tokenSet;
    try {
      tokenSet = await this.oauthProvider.exchangeCode(input.code);
    } catch {
      await this.sessionRepository.clear();
      return { ok: false, error: 'auth_failed' };
    }

    // Session fixation protection: start a brand-new session before storing
    // any credentials.
    await this.sessionRepository.regenerate();
    await this.sessionRepository.save(AuthSession.fromTokenSet(tokenSet));

    return { ok: true };
  }
}
