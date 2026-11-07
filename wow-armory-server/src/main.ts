import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './bootstrap';
import { AppLogger } from './shared/infrastructure/logging/app-logger';
import {
  SESSION_STORE,
  SessionStoreHandle,
} from './shared/infrastructure/session/session-store.factory';

const EXIT_GRACE_MS = 1000;

async function bootstrap(): Promise<void> {
  // Used until the validated configuration is available, and to report
  // startup failures (invalid configuration, Redis unreachable...).
  const bootLogger = AppLogger.fromEnv(process.env);
  let app: INestApplication | undefined;

  try {
    // Imported lazily so any error raised while evaluating the module graph
    // (ConfigModule validates the environment) is handled below.
    const { AppModule } = await import('./app.module');

    app = await NestFactory.create(AppModule, {
      logger: bootLogger,
      bufferLogs: true,
      abortOnError: false,
    });

    const logger = app.get(AppLogger);
    app.useLogger(logger);
    app.enableShutdownHooks();

    configureApp(app);

    // With SESSION_STORE=redis, refuse to serve traffic until Redis answers.
    await app.get<SessionStoreHandle>(SESSION_STORE).connect();

    const port = app.get(ConfigService).get<number>('PORT', 3000);
    await app.listen(port);

    logger.log(`Listening on port ${port}`, 'Bootstrap');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    bootLogger.error(`Startup failed: ${message}`, 'Bootstrap');

    await app?.close().catch(() => undefined);

    process.exitCode = 1;
    setTimeout(() => process.exit(1), EXIT_GRACE_MS).unref();
  }
}

void bootstrap();
