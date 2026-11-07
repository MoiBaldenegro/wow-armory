import { Request } from 'express';
import { AccessToken } from '../domain/AccessToken';
import { AuthSession } from '../domain/AuthSession';
import { RefreshToken } from '../domain/RefreshToken';
import { SessionRepository } from '../domain/ports/SessionRepository';

export class ExpressSessionRepository implements SessionRepository {
  constructor(private readonly request: Request) {}

  async saveOAuthState(state: string): Promise<void> {
    this.request.session.oauthState = state;
    await this.saveStore();
  }

  async consumeOAuthState(): Promise<string | undefined> {
    const state = this.request.session.oauthState;
    delete this.request.session.oauthState;
    await this.saveStore();
    return state;
  }

  async getSession(): Promise<AuthSession | null> {
    const session = this.request.session;

    if (!session.accessToken) {
      return null;
    }

    return AuthSession.create({
      accessToken: AccessToken.create(session.accessToken),
      refreshToken: session.refreshToken
        ? RefreshToken.create(session.refreshToken)
        : undefined,
      expiresAt: new Date(session.expiresAt ?? 0),
      battletag: session.battletag,
      accountId: session.accountId,
    });
  }

  async save(authSession: AuthSession): Promise<void> {
    const session = this.request.session;

    session.accessToken = authSession.accessToken.value;
    session.refreshToken = authSession.refreshToken?.value;
    session.expiresAt = authSession.expiresAt.getTime();
    session.battletag = authSession.battletag;
    session.accountId = authSession.accountId;

    await this.saveStore();
  }

  async regenerate(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.request.session.regenerate((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.request.session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private saveStore(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.request.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}
