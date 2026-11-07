import { OAuthProvider } from '../domain/ports/OAuthProvider';
import { SessionRepository } from '../domain/ports/SessionRepository';
import { OAuthState } from '../domain/OAuthState';

export interface StartLoginResult {
  url: string;
}

export class StartLogin {
  constructor(
    private readonly oauthProvider: OAuthProvider,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(): Promise<StartLoginResult> {
    const state = OAuthState.generate();
    await this.sessionRepository.saveOAuthState(state.value);

    return { url: this.oauthProvider.buildAuthorizationUrl(state) };
  }
}
