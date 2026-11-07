import type { AuthRepository } from '../../domain/auth/ports/AuthRepository';

export class Logout {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<void> {
    return this.repository.logout();
  }
}
