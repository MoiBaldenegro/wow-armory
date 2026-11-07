import { LoggerService } from '@nestjs/common';
import RedisStore from 'connect-redis';
import { Store } from 'express-session';
import { createClient } from 'redis';
import { maskRedisUrl, SessionStoreType } from '../../../config/env.validation';

export const SESSION_STORE = Symbol('SESSION_STORE');
export const REDIS_SESSION_PREFIX = 'wow-armory:sess:';
export const HEALTH_PING_TIMEOUT_MS = 1000;

const STARTUP_CONNECT_ATTEMPTS = 3;
const CONNECT_TIMEOUT_MS = 5000;

/** Subset of the node-redis client used by the factory and the health check. */
export interface RedisClientLike {
  readonly isOpen: boolean;
  connect(): Promise<unknown>;
  quit(): Promise<unknown>;
  ping(): Promise<string>;
  on(event: 'error', listener: (error: Error) => void): unknown;
}

export interface SessionStoreHandle {
  readonly type: SessionStoreType;
  /** `undefined` means the default `express-session` MemoryStore. */
  readonly store?: Store;
  connect(): Promise<void>;
  /** Resolves `true` when the store answers within the timeout. */
  ping(timeoutMs?: number): Promise<boolean>;
  close(): Promise<void>;
}

export interface SessionStoreFactoryOptions {
  type: SessionStoreType;
  redisUrl?: string;
  ttlMs: number;
  isProduction?: boolean;
}

export interface SessionStoreFactoryDeps {
  createRedisClient?: (url: string) => RedisClientLike;
  logger?: Pick<LoggerService, 'warn' | 'error'>;
}

export function createDefaultRedisClient(url: string): RedisClientLike {
  let hasConnected = false;

  const client = createClient({
    url,
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      // Fail fast at startup; once connected, keep retrying with backoff.
      reconnectStrategy: (retries) => {
        if (!hasConnected && retries >= STARTUP_CONNECT_ATTEMPTS) {
          return new Error('Redis connection attempts exhausted');
        }

        return Math.min(100 * 2 ** retries, 3000);
      },
    },
  });

  client.on('ready', () => {
    hasConnected = true;
  });

  return client;
}

function scrubSecret(message: string, url: string): string {
  let password = '';

  try {
    password = decodeURIComponent(new URL(url).password);
  } catch {
    password = '';
  }

  return password ? message.split(password).join('****') : message;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class MemorySessionStoreHandle implements SessionStoreHandle {
  readonly type = 'memory' as const;
  readonly store = undefined;

  async connect(): Promise<void> {
    return undefined;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    return undefined;
  }
}

class RedisSessionStoreHandle implements SessionStoreHandle {
  readonly type = 'redis' as const;
  readonly store: Store;

  constructor(
    private readonly client: RedisClientLike,
    private readonly url: string,
    ttlMs: number,
    private readonly logger?: Pick<LoggerService, 'warn' | 'error'>,
  ) {
    this.store = new RedisStore({
      client,
      prefix: REDIS_SESSION_PREFIX,
      ttl: Math.ceil(ttlMs / 1000),
    });

    client.on('error', (error: Error) => {
      this.logger?.error(
        `Redis session store error: ${scrubSecret(error.message, this.url)}`,
        'SessionStore',
      );
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      throw new Error(
        `Could not connect to Redis at ${maskRedisUrl(this.url)}: ${scrubSecret(reason, this.url)}`,
      );
    }
  }

  async ping(timeoutMs = HEALTH_PING_TIMEOUT_MS): Promise<boolean> {
    try {
      await withTimeout(this.client.ping(), timeoutMs);
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger?.warn(
        `Error while closing the Redis client: ${scrubSecret(reason, this.url)}`,
        'SessionStore',
      );
    }
  }
}

/**
 * Builds the `express-session` store selected by `SESSION_STORE`.
 * `memory` keeps the default MemoryStore; `redis` uses `connect-redis` with a
 * node-redis client created from `REDIS_URL`.
 */
export function createSessionStore(
  options: SessionStoreFactoryOptions,
  deps: SessionStoreFactoryDeps = {},
): SessionStoreHandle {
  if (options.type === 'redis') {
    if (!options.redisUrl) {
      throw new Error('REDIS_URL is required when SESSION_STORE=redis');
    }

    const client = (deps.createRedisClient ?? createDefaultRedisClient)(
      options.redisUrl,
    );

    return new RedisSessionStoreHandle(
      client,
      options.redisUrl,
      options.ttlMs,
      deps.logger,
    );
  }

  if (options.isProduction) {
    deps.logger?.warn(
      'SESSION_STORE=memory in production: sessions are lost on restart and are not shared between instances.',
      'SessionStore',
    );
  }

  return new MemorySessionStoreHandle();
}
