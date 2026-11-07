/**
 * Outbound port for the application-level token used to call Blizzard's
 * public profile API. Implementations must cache the token and never expose it
 * outside the server.
 */
export interface ApplicationTokenProvider {
  getAccessToken(): Promise<string>;
}
