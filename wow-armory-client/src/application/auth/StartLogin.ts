import type { AuthRepository } from '../../domain/auth/ports/AuthRepository';

export class StartLogin {
  constructor(private readonly repository: AuthRepository) {}

  execute(): Promise<string> {
    return this.repository.getLoginUrl();
  }
}
