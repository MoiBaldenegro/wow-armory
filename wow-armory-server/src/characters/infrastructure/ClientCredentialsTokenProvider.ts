import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';
import { BlizzardUnavailable } from '../domain/errors/CharacterError';

const TOKEN_URL = 'https://oauth.battle.net/token';
const DEFAULT_EXPIRES_IN_SECONDS = 3600;
const REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_TOKEN_REFRESH_MARGIN_SECONDS = 60;

interface RawTokenResponse {
  access_token?: string;
  expires_in?: number | string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Obtains and caches an application token with the `client_credentials`
 * grant. Credentials are read from `ConfigService` only; the token itself is
 * never logged or returned to callers.
 */
export class ClientCredentialsTokenProvider
  implements ApplicationTokenProvider
{
  private cachedToken: CachedToken | null = null;
  private inFlightRequest: Promise<CachedToken> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly refreshMarginSeconds = DEFAULT_TOKEN_REFRESH_MARGIN_SECONDS,
  ) {}

  async getAccessToken(): Promise<string> {
    const token = await this.getCachedOrFetch();
    return token.accessToken;
  }

  private async getCachedOrFetch(): Promise<CachedToken> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken;
    }

    if (!this.inFlightRequest) {
      this.inFlightRequest = this.requestToken().finally(() => {
        this.inFlightRequest = null;
      });
    }

    return this.inFlightRequest;
  }

  private async requestToken(): Promise<CachedToken> {
    const clientId = this.config.get<string>('BLIZZARD_CLIENT_ID') ?? '';
    const clientSecret =
      this.config.get<string>('BLIZZARD_CLIENT_SECRET') ?? '';

    if (!clientId || !clientSecret) {
      throw new BlizzardUnavailable();
    }

    try {
      const response = await axios.post<RawTokenResponse>(
        TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      const accessToken = response.data?.access_token;

      if (typeof accessToken !== 'string' || accessToken.length === 0) {
        throw new BlizzardUnavailable();
      }

      const expiresIn = Number(response.data?.expires_in);
      const ttlSeconds =
        Number.isFinite(expiresIn) && expiresIn > 0
          ? expiresIn
          : DEFAULT_EXPIRES_IN_SECONDS;
      const effectiveTtlSeconds = Math.max(
        ttlSeconds - this.refreshMarginSeconds,
        0,
      );

      this.cachedToken = {
        accessToken,
        expiresAt: Date.now() + effectiveTtlSeconds * 1000,
      };

      return this.cachedToken;
    } catch (error) {
      if (error instanceof BlizzardUnavailable) {
        throw error;
      }

      throw new BlizzardUnavailable();
    }
  }
}
