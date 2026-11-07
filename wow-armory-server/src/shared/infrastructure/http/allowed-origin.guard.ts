import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { parseOrigins } from '../../../config/env.validation';

/**
 * CSRF defence for state-changing routes that rely on the session cookie:
 * a request carrying an `Origin` header outside the CORS allowlist is
 * rejected with 403 before the handler runs. Requests without `Origin`
 * (same-origin navigations, server-to-server, tests) keep working.
 */
@Injectable()
export class AllowedOriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(config: ConfigService) {
    this.allowedOrigins = new Set(
      parseOrigins(config.get<string>('CORS_ORIGINS', '')),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;

    if (origin === undefined) {
      return true;
    }

    if (!this.allowedOrigins.has(origin)) {
      throw new ForbiddenException('Origin not allowed.');
    }

    return true;
  }
}
