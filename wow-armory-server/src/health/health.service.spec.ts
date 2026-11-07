import { ConfigService } from '@nestjs/config';
import {
  createSessionStore,
  SessionStoreHandle,
} from '../shared/infrastructure/session/session-store.factory';
import { HealthService } from './health.service';

function fakeStore(
  type: 'memory' | 'redis',
  ping: SessionStoreHandle['ping'],
): SessionStoreHandle {
  return {
    type,
    store: undefined,
    connect: async () => undefined,
    close: async () => undefined,
    ping,
  };
}

function fakeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

describe('HealthService', () => {
  const config = fakeConfig({ APP_VERSION: '1.2.3' });

  it('reports ok with uptime, version and the memory store', async () => {
    const service = new HealthService(
      fakeStore('memory', async () => true),
      config,
    );

    const report = await service.check();

    expect(report).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      version: '1.2.3',
      sessionStore: { type: 'memory', status: 'up' },
    });
    expect(Number.isInteger(report.uptime)).toBe(true);
  });

  it('reports ok when redis answers the ping', async () => {
    const ping = jest.fn(async () => true);
    const service = new HealthService(fakeStore('redis', ping), config);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      sessionStore: { type: 'redis', status: 'up' },
    });
    expect(ping).toHaveBeenCalledWith(1000);
  });

  it('reports error and down when redis does not answer', async () => {
    const service = new HealthService(
      fakeStore('redis', async () => false),
      config,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'error',
      sessionStore: { type: 'redis', status: 'down' },
    });
  });

  it('reports down when a real ping times out after 1 second', async () => {
    jest.useFakeTimers();
    const handle = createSessionStore(
      { type: 'redis', redisUrl: 'redis://localhost:6379', ttlMs: 1000 },
      {
        createRedisClient: () => ({
          isOpen: true,
          connect: async () => undefined,
          quit: async () => undefined,
          ping: () => new Promise<string>(() => undefined),
          on: () => undefined,
        }),
      },
    );
    const service = new HealthService(handle, config);

    const pending = service.check();
    await jest.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toMatchObject({
      status: 'error',
      sessionStore: { type: 'redis', status: 'down' },
    });
    jest.useRealTimers();
  });
});
