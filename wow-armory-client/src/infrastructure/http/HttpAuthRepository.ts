import {
  AuthError,
  AuthInvalidResponse,
  AuthUnavailable,
} from '../../domain/auth/errors/AuthErrors';
import type { AuthRepository } from '../../domain/auth/ports/AuthRepository';
import type { Session } from '../../domain/auth/Session';
import { HttpError } from './HttpError';
import type { HttpClient } from './HttpClient';

interface SessionResponseDto {
  authenticated: boolean;
  user?: {
    battletag?: string;
  };
}

interface LoginResponseDto {
  url: string;
}

export class HttpAuthRepository implements AuthRepository {
  constructor(private readonly http: HttpClient) {}

  async getSession(): Promise<Session> {
    try {
      const dto = await this.http.get<SessionResponseDto>('/auth/session');

      if (!dto || typeof dto.authenticated !== 'boolean') {
        throw new AuthInvalidResponse('Invalid session response.');
      }

      const session: Session = { authenticated: dto.authenticated };

      if (dto.user !== undefined) {
        session.user = { battletag: dto.user.battletag };
      }

      return session;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getLoginUrl(): Promise<string> {
    try {
      const dto = await this.http.get<LoginResponseDto>('/auth/login');

      if (!dto || typeof dto.url !== 'string' || dto.url.length === 0) {
        throw new AuthInvalidResponse('Invalid login response.');
      }

      return dto.url;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.http.post<void>('/auth/logout', null);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): AuthError {
    if (error instanceof AuthError) {
      return error;
    }

    if (error instanceof HttpError) {
      if (error.status === 0 || error.status >= 500) {
        return new AuthUnavailable();
      }

      return new AuthInvalidResponse();
    }

    return new AuthUnavailable();
  }
}
