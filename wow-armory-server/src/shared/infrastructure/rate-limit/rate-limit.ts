import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export type RateLimitPolicy = 'auth' | 'public';

export const RATE_LIMIT_POLICY = 'wow-armory:rate-limit-policy';
export const RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

/**
 * Marks a route with a rate limit policy. Routes without a policy (for example
 * `GET /health`) are not rate limited.
 */
export const RateLimit = (policy: RateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_POLICY, policy);

export interface RateLimitSettings {
  ttlMs: number;
  authLimit: number;
  publicLimit: number;
}

const reflector = new Reflector();

export function getRateLimitPolicy(
  context: ExecutionContext,
): RateLimitPolicy | undefined {
  return reflector.getAllAndOverride<RateLimitPolicy | undefined>(
    RATE_LIMIT_POLICY,
    [context.getHandler(), context.getClass()],
  );
}

/**
 * Builds the `@nestjs/throttler` options. A single throttler named `default`
 * is used so the response header is exactly `Retry-After` (named throttlers
 * add a `-<name>` suffix); the limit depends on the route policy. The tracker
 * is the throttler default, `req.ip`, which honours Express `trust proxy`.
 */
export function buildThrottlerOptions(
  settings: RateLimitSettings,
): ThrottlerModuleOptions {
  return {
    errorMessage: RATE_LIMIT_MESSAGE,
    skipIf: (context) => getRateLimitPolicy(context) === undefined,
    throttlers: [
      {
        name: 'default',
        ttl: settings.ttlMs,
        limit: (context) =>
          getRateLimitPolicy(context) === 'auth'
            ? settings.authLimit
            : settings.publicLimit,
      },
    ],
  };
}
