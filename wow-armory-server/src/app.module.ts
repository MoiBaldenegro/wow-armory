import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CharactersModule } from './characters/infrastructure/characters.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/infrastructure/identity.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { buildThrottlerOptions } from './shared/infrastructure/rate-limit/rate-limit';
import { SessionModule } from './shared/infrastructure/session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildThrottlerOptions({
          ttlMs: config.get<number>('RATE_LIMIT_TTL_MS', 60_000),
          authLimit: config.get<number>('RATE_LIMIT_AUTH_LIMIT', 10),
          publicLimit: config.get<number>('RATE_LIMIT_PUBLIC_LIMIT', 60),
        }),
    }),
    LoggingModule,
    SessionModule,
    HealthModule,
    CharactersModule,
    IdentityModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
