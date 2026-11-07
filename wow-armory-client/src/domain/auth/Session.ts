export interface SessionUser {
  battletag?: string;
}

export interface Session {
  authenticated: boolean;
  user?: SessionUser;
}
