import { AuthSession } from '../AuthSession';

export interface SessionRepository {
  saveOAuthState(state: string): Promise<void>;
  consumeOAuthState(): Promise<string | undefined>;
  getSession(): Promise<AuthSession | null>;
  save(session: AuthSession): Promise<void>;
  regenerate(): Promise<void>;
  clear(): Promise<void>;
}
