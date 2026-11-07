import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowedOriginGuard } from './allowed-origin.guard';

function contextWithOrigin(origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: origin ? { origin } : {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('AllowedOriginGuard', () => {
  const guard = new AllowedOriginGuard({
    get: () => 'https://app.example.com,https://www.example.com',
  } as unknown as ConfigService);

  it('allows requests without an Origin header', () => {
    expect(guard.canActivate(contextWithOrigin())).toBe(true);
  });

  it('allows allow-listed origins', () => {
    expect(
      guard.canActivate(contextWithOrigin('https://www.example.com')),
    ).toBe(true);
  });

  it('rejects other origins with 403', () => {
    expect(() =>
      guard.canActivate(contextWithOrigin('https://evil.example.com')),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWithOrigin('null'))).toThrow(
      ForbiddenException,
    );
  });
});
