export interface SessionUser {
  battletag?: string;
  accountId?: string;
}

export interface Session {
  authenticated: boolean;
  user?: SessionUser;
}
