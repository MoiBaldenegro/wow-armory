import axios from 'axios';
import { OAuthState } from '../domain/OAuthState';
import { RefreshToken } from '../domain/RefreshToken';
import { OAuthProvider, OAuthTokenSet } from '../domain/ports/OAuthProvider';
import {
  TokenExchangeError,
  TokenRefreshError,
} from '../domain/errors/IdentityError';

const AUTHORIZE_URL = 'https://oauth.battle.net/authorize';
const TOKEN_URL = 'https://oauth.battle.net/token';
const USERINFO_URL = 'https://oauth.battle.net/userinfo';

export interface BattleNetOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
}

interface UserInfoResponse {
  id?: string | number;
  sub?: string;
  battletag?: string;
}

export class BattleNetOAuthAdapter implements OAuthProvider {
  constructor(private readonly config: BattleNetOAuthConfig) {}

  buildAuthorizationUrl(state: OAuthState): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid battletag wow.profile',
      state: state.value,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    try {
      const data = await this.requestToken({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      });

      const tokenSet = this.toTokenSet(data, TokenExchangeError);
      const userInfo = await this.getUserInfo(tokenSet.accessToken);

      return {
        ...tokenSet,
        battletag: userInfo.battletag,
        accountId: userInfo.id?.toString() ?? userInfo.sub,
      };
    } catch (error) {
      if (error instanceof TokenExchangeError) {
        throw error;
      }
      throw new TokenExchangeError();
    }
  }

  async refresh(refreshToken: RefreshToken): Promise<OAuthTokenSet> {
    try {
      const data = await this.requestToken({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken.value,
        grant_type: 'refresh_token',
      });

      return this.toTokenSet(data, TokenRefreshError);
    } catch (error) {
      if (error instanceof TokenRefreshError) {
        throw error;
      }
      throw new TokenRefreshError();
    }
  }

  private async requestToken(
    values: Record<string, string>,
  ): Promise<RawTokenResponse> {
    // Credentials and codes must stay out of the URL so they never leak into
    // proxy, CDN or APM access logs.
    const response = await axios.post<RawTokenResponse>(
      TOKEN_URL,
      new URLSearchParams(values),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10_000,
      },
    );

    return response.data;
  }

  private async getUserInfo(accessToken: string): Promise<UserInfoResponse> {
    const response = await axios.get<UserInfoResponse>(USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10_000,
    });

    return response.data ?? {};
  }

  private toTokenSet(
    data: RawTokenResponse,
    ErrorType: typeof TokenExchangeError | typeof TokenRefreshError,
  ): OAuthTokenSet {
    if (!data || typeof data.access_token !== 'string' || !data.access_token) {
      throw new ErrorType();
    }

    const expiresIn = Number(data.expires_in);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : 0,
    };
  }
}
