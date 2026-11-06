import { SessionRepository } from '../domain/ports/SessionRepository';

export class Logout {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(): Promise<void> {
    await this.sessionRepository.clear();
  }
}
