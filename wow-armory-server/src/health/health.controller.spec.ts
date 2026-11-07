import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthReport, HealthService } from './health.service';

describe('HealthController', () => {
  const base: HealthReport = {
    status: 'ok',
    uptime: 1,
    version: '1.0.0',
    sessionStore: { type: 'redis', status: 'up' },
  };

  it('returns the report when healthy', async () => {
    const controller = new HealthController({
      check: async () => base,
    } as unknown as HealthService);

    await expect(controller.check()).resolves.toEqual(base);
  });

  it('throws 503 with the report body when unhealthy', async () => {
    const down: HealthReport = {
      ...base,
      status: 'error',
      sessionStore: { type: 'redis', status: 'down' },
    };
    const controller = new HealthController({
      check: async () => down,
    } as unknown as HealthService);

    const error = await controller.check().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect((error as ServiceUnavailableException).getResponse()).toEqual(down);
  });
});
