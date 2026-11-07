import type { Session } from '../Session';

export interface AuthRepository {
  getSession(): Promise<Session>;
  getLoginUrl(): Promise<string>;
  logout(): Promise<void>;
}
