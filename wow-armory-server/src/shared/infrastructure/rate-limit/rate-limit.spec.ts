import { Controller, ExecutionContext, Get } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';
import {
  buildThrottlerOptions,
  getRateLimitPolicy,
  RATE_LIMIT_MESSAGE,
  RateLimit,
} from './rate-limit';

@Controller()
class SampleController {
  @Get('auth')
  @RateLimit('auth')
  auth() {
    return 'auth';
  }

  @Get('public')
  @RateLimit('public')
  publicRoute() {
    return 'public';
  }

  @Get('open')
  open() {
    return 'open';
  }
}

function contextFor(handler: keyof SampleController): ExecutionContext {
  return {
    getHandler: () => SampleController.prototype[handler],
    getClass: () => SampleController,
  } as unknown as ExecutionContext;
}

describe('rate limit options', () => {
  const options = buildThrottlerOptions({
    ttlMs: 60_000,
    authLimit: 10,
    publicLimit: 60,
  }) as {
    errorMessage: string;
    skipIf: (context: ExecutionContext) => boolean;
    throttlers: ThrottlerOptions[];
  };

  it('uses a single default throttler so the header is exactly Retry-After', () => {
    expect(options.throttlers).toHaveLength(1);
    expect(options.throttlers[0].name).toBe('default');
    expect(options.throttlers[0].ttl).toBe(60_000);
    expect(options.errorMessage).toBe(RATE_LIMIT_MESSAGE);
  });

  it('applies the auth and public limits by route policy', () => {
    const limit = options.throttlers[0].limit as (
      context: ExecutionContext,
    ) => number;

    expect(getRateLimitPolicy(contextFor('auth'))).toBe('auth');
    expect(limit(contextFor('auth'))).toBe(10);
    expect(limit(contextFor('publicRoute'))).toBe(60);
  });

  it('skips routes without a policy', () => {
    expect(options.skipIf(contextFor('open'))).toBe(true);
    expect(options.skipIf(contextFor('auth'))).toBe(false);
  });
});
