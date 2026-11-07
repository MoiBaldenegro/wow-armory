import { RefreshToken } from './RefreshToken';
import { SessionRepository } from '../domain/ports/SessionRepository';

export interface CheckSessionUser {
  battletag?: string;
  accountId?: string;
}

export interface CheckSessionResult {
  authenticated: boolean;
  user?: CheckSessionUser;
}

export class CheckSession {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly refreshToken: RefreshToken,
    private readonly refreshMarginMs: number,
  ) {}

  async execute(): Promise<CheckSessionResult> {
    let session = await this.sessionRepository.getSession();

    if (!session) {
      return { authenticated: false };
    }

    if (session.isExpiringWithin(this.refreshMarginMs)) {
      session = await this.refreshToken.execute();

      if (!session) {
        return { authenticated: false };
      }
    }

    return {
      authenticated: true,
      ...(session.battletag || session.accountId
        ? {
            user: {
              ...(session.battletag ? { battletag: session.battletag } : {}),
              ...(session.accountId ? { accountId: session.accountId } : {}),
            },
          }
        : {}),
    };
  }
}
