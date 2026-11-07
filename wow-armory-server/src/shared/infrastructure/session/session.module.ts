import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionStoreType } from '../../../config/env.validation';
import { DEFAULT_SESSION_TTL_MS } from './session-cookie';
import {
  createSessionStore,
  SESSION_STORE,
  SessionStoreHandle,
} from './session-store.factory';

@Injectable()
export class SessionStoreLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(SESSION_STORE) private readonly handle: SessionStoreHandle,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SESSION_STORE,
      useFactory: (config: ConfigService): SessionStoreHandle =>
        createSessionStore(
          {
            type: config.get<SessionStoreType>('SESSION_STORE', 'memory'),
            redisUrl: config.get<string>('REDIS_URL'),
            ttlMs: config.get<number>('SESSION_TTL_MS', DEFAULT_SESSION_TTL_MS),
            isProduction: config.get<string>('NODE_ENV') === 'production',
          },
          { logger: new Logger('SessionStore') },
        ),
      inject: [ConfigService],
    },
    SessionStoreLifecycle,
  ],
  exports: [SESSION_STORE],
})
export class SessionModule {}
