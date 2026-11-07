import { SessionData } from 'express-session';
import {
  createSessionStore,
  REDIS_SESSION_PREFIX,
  RedisClientLike,
} from './session-store.factory';

const PASSWORD = 'REDIS-PASSWORD-SENTINEL';
const REDIS_URL = `rediss://default:${PASSWORD}@cache.upstash.io:6379`;

class FakeRedisClient implements RedisClientLike {
  isOpen = false;
  connectError?: Error;
  pingImpl: () => Promise<string> = async () => 'PONG';
  readonly sets: Array<{ key: string; value: string; options?: unknown }> = [];
  readonly listeners: Array<(error: Error) => void> = [];
  quitCalls = 0;

  // Presence of scanIterator makes connect-redis use the node-redis API.
  scanIterator = async function* () {
    yield* [];
  };

  async connect(): Promise<unknown> {
    if (this.connectError) {
      throw this.connectError;
    }

    this.isOpen = true;
    return this;
  }

  async quit(): Promise<unknown> {
    this.quitCalls += 1;
    this.isOpen = false;
    return 'OK';
  }

  ping(): Promise<string> {
    return this.pingImpl();
  }

  on(_event: 'error', listener: (error: Error) => void): unknown {
    this.listeners.push(listener);
    return this;
  }

  async set(key: string, value: string, options?: unknown): Promise<string> {
    this.sets.push({ key, value, options });
    return 'OK';
  }

  async get(): Promise<string | null> {
    return null;
  }
}

function storeSet(
  store: {
    set: (sid: string, data: SessionData, cb: (err?: unknown) => void) => void;
  },
  sid: string,
  data: SessionData,
): Promise<void> {
  return new Promise((resolve, reject) =>
    store.set(sid, data, (error) => (error ? reject(error) : resolve())),
  );
}

describe('createSessionStore', () => {
  it('uses the default MemoryStore for memory', async () => {
    const handle = createSessionStore({ type: 'memory', ttlMs: 1000 });

    expect(handle.type).toBe('memory');
    expect(handle.store).toBeUndefined();
    await expect(handle.connect()).resolves.toBeUndefined();
    await expect(handle.ping()).resolves.toBe(true);
    await expect(handle.close()).resolves.toBeUndefined();
  });

  it('warns about memory sessions in production', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };

    createSessionStore(
      { type: 'memory', ttlMs: 1000, isProduction: true },
      { logger },
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/lost on restart.*not shared between instances/),
      'SessionStore',
    );
  });

  it('does not warn about memory sessions outside production', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };

    createSessionStore({ type: 'memory', ttlMs: 1000 }, { logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('builds a connect-redis store from REDIS_URL with the fixed prefix and TTL', async () => {
    const client = new FakeRedisClient();
    const createRedisClient = jest.fn(() => client);

    const handle = createSessionStore(
      { type: 'redis', redisUrl: REDIS_URL, ttlMs: 7_200_000 },
      { createRedisClient },
    );

    expect(handle.type).toBe('redis');
    expect(createRedisClient).toHaveBeenCalledWith(REDIS_URL);
    expect(handle.store).toMatchObject({
      prefix: REDIS_SESSION_PREFIX,
      ttl: 7200,
    });

    await storeSet(handle.store as never, 'sid-1', {
      cookie: {},
    } as unknown as SessionData);

    expect(client.sets).toEqual([
      {
        key: 'wow-armory:sess:sid-1',
        value: expect.any(String),
        options: { EX: 7200 },
      },
    ]);
  });

  it('throws when REDIS_URL is missing', () => {
    expect(() => createSessionStore({ type: 'redis', ttlMs: 1000 })).toThrow(
      /REDIS_URL is required/,
    );
  });

  it('connects and closes the client', async () => {
    const client = new FakeRedisClient();
    const handle = createSessionStore(
      { type: 'redis', redisUrl: REDIS_URL, ttlMs: 1000 },
      { createRedisClient: () => client },
    );

    await handle.connect();
    expect(client.isOpen).toBe(true);

    await handle.close();
    await handle.close();
    expect(client.quitCalls).toBe(1);
  });

  it('masks the password when the connection fails', async () => {
    const client = new FakeRedisClient();
    client.connectError = new Error(`auth failed for ${PASSWORD}`);
    const handle = createSessionStore(
      { type: 'redis', redisUrl: REDIS_URL, ttlMs: 1000 },
      { createRedisClient: () => client },
    );

    const error = await handle.connect().catch((err: Error) => err);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      'rediss://default:****@cache.upstash.io:6379',
    );
    expect((error as Error).message).not.toContain(PASSWORD);
  });

  it('logs client errors without the password', () => {
    const client = new FakeRedisClient();
    const logger = { warn: jest.fn(), error: jest.fn() };
    createSessionStore(
      { type: 'redis', redisUrl: REDIS_URL, ttlMs: 1000 },
      { createRedisClient: () => client, logger },
    );

    client.listeners.forEach((listener) =>
      listener(new Error(`WRONGPASS ${PASSWORD}`)),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.not.stringContaining(PASSWORD),
      'SessionStore',
    );
  });

  it('reports ping failures and timeouts as down', async () => {
    const client = new FakeRedisClient();
    const handle = createSessionStore(
      { type: 'redis', redisUrl: REDIS_URL, ttlMs: 1000 },
      { createRedisClient: () => client },
    );

    await expect(handle.ping()).resolves.toBe(true);

    client.pingImpl = () => Promise.reject(new Error('down'));
    await expect(handle.ping()).resolves.toBe(false);

    client.pingImpl = () => new Promise(() => undefined);
    await expect(handle.ping(20)).resolves.toBe(false);
  });
});
