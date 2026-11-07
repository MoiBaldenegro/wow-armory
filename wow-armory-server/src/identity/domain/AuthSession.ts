import { AccessToken } from './AccessToken';
import { RefreshToken } from './RefreshToken';
import { InvalidSessionError } from './errors/IdentityError';
import { OAuthTokenSet } from './ports/OAuthProvider';

export interface AuthSessionProps {
  accessToken: AccessToken;
  refreshToken?: RefreshToken;
  expiresAt: Date;
  battletag?: string;
}

export class AuthSession {
  private constructor(private readonly props: AuthSessionProps) {}

  static create(props: AuthSessionProps): AuthSession {
    if (
      !(props.expiresAt instanceof Date) ||
      Number.isNaN(props.expiresAt.getTime())
    ) {
      throw new InvalidSessionError('The session expiration date is invalid.');
    }

    return new AuthSession(props);
  }

  static fromTokenSet(tokenSet: OAuthTokenSet, now = new Date()): AuthSession {
    return AuthSession.create({
      accessToken: AccessToken.create(tokenSet.accessToken),
      refreshToken: tokenSet.refreshToken
        ? RefreshToken.create(tokenSet.refreshToken)
        : undefined,
      expiresAt: new Date(now.getTime() + tokenSet.expiresIn * 1000),
      battletag: tokenSet.battletag,
    });
  }

  get accessToken(): AccessToken {
    return this.props.accessToken;
  }

  get refreshToken(): RefreshToken | undefined {
    return this.props.refreshToken;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get battletag(): string | undefined {
    return this.props.battletag;
  }

  isExpiringWithin(marginMs: number, now = new Date()): boolean {
    return this.props.expiresAt.getTime() - now.getTime() <= marginMs;
  }

  refreshedWith(tokenSet: OAuthTokenSet, now = new Date()): AuthSession {
    return AuthSession.create({
      accessToken: AccessToken.create(tokenSet.accessToken),
      refreshToken: tokenSet.refreshToken
        ? RefreshToken.create(tokenSet.refreshToken)
        : this.props.refreshToken,
      expiresAt: new Date(now.getTime() + tokenSet.expiresIn * 1000),
      battletag: tokenSet.battletag ?? this.props.battletag,
    });
  }
}
