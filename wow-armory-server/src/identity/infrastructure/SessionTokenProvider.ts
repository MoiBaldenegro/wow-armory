import { RefreshToken } from '../application/RefreshToken';
import { AccessToken } from '../domain/AccessToken';
import { SessionRepository } from '../domain/ports/SessionRepository';
import { TokenProvider } from '../domain/ports/TokenProvider';

export class SessionTokenProvider implements TokenProvider {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly refreshToken: RefreshToken,
    private readonly refreshMarginMs: number,
  ) {}

  async getValidAccessToken(): Promise<AccessToken | null> {
    const session = await this.sessionRepository.getSession();

    if (!session) {
      return null;
    }

    if (!session.isExpiringWithin(this.refreshMarginMs)) {
      return session.accessToken;
    }

    const refreshedSession = await this.refreshToken.execute();
    return refreshedSession ? refreshedSession.accessToken : null;
  }
}
