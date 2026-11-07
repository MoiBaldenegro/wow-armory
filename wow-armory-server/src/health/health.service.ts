import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStoreType } from '../config/env.validation';
import {
  HEALTH_PING_TIMEOUT_MS,
  SESSION_STORE,
  SessionStoreHandle,
} from '../shared/infrastructure/session/session-store.factory';

export interface HealthReport {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  sessionStore: {
    type: SessionStoreType;
    status: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(SESSION_STORE) private readonly sessionStore: SessionStoreHandle,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthReport> {
    const storeUp = await this.sessionStore.ping(HEALTH_PING_TIMEOUT_MS);

    return {
      status: storeUp ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      version: this.config.get<string>('APP_VERSION', '0.0.0'),
      sessionStore: {
        type: this.sessionStore.type,
        status: storeUp ? 'up' : 'down',
      },
    };
  }
}
