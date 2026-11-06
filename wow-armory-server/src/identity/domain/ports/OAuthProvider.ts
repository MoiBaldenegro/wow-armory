import { OAuthState } from '../OAuthState';
import { RefreshToken } from '../RefreshToken';

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  battletag?: string;
}

export interface OAuthProvider {
  buildAuthorizationUrl(state: OAuthState): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refresh(refreshToken: RefreshToken): Promise<OAuthTokenSet>;
}
