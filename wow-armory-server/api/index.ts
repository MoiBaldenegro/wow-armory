import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RequestHandler } from 'express';
import { configureApp } from '../src/bootstrap';
import { AppModule } from '../src/app.module';
import { AppLogger } from '../src/shared/infrastructure/logging/app-logger';
import {
  SESSION_STORE,
  SessionStoreHandle,
} from '../src/shared/infrastructure/session/session-store.factory';

let appPromise: Promise<INestApplication> | undefined;

async function createApp(): Promise<INestApplication> {
  const bootLogger = AppLogger.fromEnv(process.env);
  const app = await NestFactory.create(AppModule, {
    logger: bootLogger,
    bufferLogs: true,
    abortOnError: false,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  configureApp(app);
  await app.get<SessionStoreHandle>(SESSION_STORE).connect();
  await app.init();

  logger.log(
    `Serverless app initialized on port ${app
      .get(ConfigService)
      .get<number>('PORT', 3000)}`,
    'Vercel',
  );

  return app;
}

function getApp(): Promise<INestApplication> {
  appPromise ??= createApp().catch((error: unknown) => {
    appPromise = undefined;
    throw error;
  });
  return appPromise;
}

export default async function handler(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
): Promise<void> {
  const app = await getApp();
  const expressHandler = app.getHttpAdapter().getInstance() as RequestHandler;
  expressHandler(request, response, () => undefined);
}
