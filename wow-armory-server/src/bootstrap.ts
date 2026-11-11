import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// These packages export a single function (`export =`). `import x = require()`
// yields that function with or without `esModuleInterop`; `import * as` does
// not (Vercel's builder enables interop and the server crashed with
// "cookieParser is not a function").
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import session = require('express-session');
import { parseOrigins, TrustProxy } from './config/env.validation';
import { AppLogger } from './shared/infrastructure/logging/app-logger';
import {
  createRequestLoggingMiddleware,
  REQUEST_ID_HEADER,
} from './shared/infrastructure/logging/request-logging.middleware';
import { SESSION_COOKIE_NAME } from './shared/infrastructure/session.constants';
import { buildSessionCookieOptions } from './shared/infrastructure/session/session-cookie';
import {
  SESSION_STORE,
  SessionStoreHandle,
} from './shared/infrastructure/session/session-store.factory';

export { parseOrigins };

/**
 * Shared HTTP bootstrap used by `main.ts` and the e2e tests so both paths
 * configure logging, sessions, cookies, proxy trust and CORS identically.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const express = app.getHttpAdapter().getInstance();

  express.set(
    'trust proxy',
    config.get<TrustProxy>('TRUST_PROXY', isProduction ? 1 : false),
  );
  express.disable('x-powered-by');

  app.use(createRequestLoggingMiddleware(app.get(AppLogger)));
  app.use(cookieParser());
  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      name: SESSION_COOKIE_NAME,
      store: app.get<SessionStoreHandle>(SESSION_STORE).store,
      cookie: buildSessionCookieOptions(config),
    }),
  );

  app.enableCors({
    origin: parseOrigins(config.get<string>('CORS_ORIGINS', '')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      REQUEST_ID_HEADER,
    ],
    exposedHeaders: ['Retry-After', REQUEST_ID_HEADER],
  });
}
