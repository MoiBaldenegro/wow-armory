import { AuthSession } from '../domain/AuthSession';
import { OAuthProvider } from '../domain/ports/OAuthProvider';
import { SessionRepository } from '../domain/ports/SessionRepository';

export class RefreshToken {
  constructor(
    private readonly oauthProvider: OAuthProvider,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(): Promise<AuthSession | null> {
    const session = await this.sessionRepository.getSession();

    if (!session) {
      return null;
    }

    if (!session.refreshToken) {
      await this.sessionRepository.clear();
      return null;
    }

    try {
      const tokenSet = await this.oauthProvider.refresh(session.refreshToken);
      const refreshedSession = session.refreshedWith(tokenSet);
      await this.sessionRepository.save(refreshedSession);
      return refreshedSession;
    } catch {
      await this.sessionRepository.clear();
      return null;
    }
  }
}
