import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { SESSION_COOKIE_NAME } from './shared/infrastructure/session.constants';

const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Shared HTTP bootstrap used by `main.ts` and the e2e tests so both paths
 * configure sessions, cookies, proxy trust and CORS identically.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      name: SESSION_COOKIE_NAME,
      cookie: {
        httpOnly: true,
        secure: config.get<boolean>('COOKIE_SECURE', isProduction),
        sameSite: config.get<'lax' | 'strict' | 'none'>(
          'COOKIE_SAME_SITE',
          'lax',
        ),
        domain: config.get<string>('COOKIE_DOMAIN') || undefined,
        maxAge: SESSION_MAX_AGE_MS,
        path: '/',
      },
    }),
  );

  app.enableCors({
    origin: parseOrigins(
      config.get<string>('CORS_ORIGINS', DEFAULT_CORS_ORIGINS),
    ),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Retry-After'],
  });
}
