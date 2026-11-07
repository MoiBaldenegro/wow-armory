import { AccessToken } from '../AccessToken';

/**
 * Outbound port for consumers that need a usable Battle.net access token
 * (for example, the future character context). It must never expose tokens
 * to the browser.
 */
export interface TokenProvider {
  getValidAccessToken(): Promise<AccessToken | null>;
}
