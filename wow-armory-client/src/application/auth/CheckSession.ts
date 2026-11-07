import type { AuthRepository } from '../../domain/auth/ports/AuthRepository';
import type { Session } from '../../domain/auth/Session';

export class CheckSession {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<Session> {
    return this.repository.getSession();
  }
}
