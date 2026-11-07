import { describe, expect, it } from 'vitest';
import { HttpError, toHttpError } from './HttpError';

function axiosResponseError(
  status: number,
  headers: Record<string, string> = {},
  data: unknown = {},
) {
  return {
    isAxiosError: true,
    response: { status, headers, data },
  };
}

describe('HttpError', () => {
  it('builds an error with status, retry after and code', () => {
    const error = new HttpError({
      status: 429,
      retryAfterSeconds: 42,
      code: 'rate_limited',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(42);
    expect(error.code).toBe('rate_limited');
  });

  it('normalizes 400 responses without exposing the body', () => {
    const error = toHttpError(
      axiosResponseError(400, {}, { message: 'raw server body' }),
    );

    expect(error.status).toBe(400);
    expect(error.message).not.toContain('raw server body');
  });

  it('normalizes 404 responses', () => {
    expect(toHttpError(axiosResponseError(404)).status).toBe(404);
  });

  it('reads Retry-After on 429 responses', () => {
    const error = toHttpError(
      axiosResponseError(429, { 'retry-after': '42' }),
    );

    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(42);
  });

  it('normalizes 502 responses', () => {
    expect(toHttpError(axiosResponseError(502)).status).toBe(502);
  });

  it('normalizes network errors as status 0', () => {
    const error = toHttpError({
      isAxiosError: true,
      code: 'ECONNABORTED',
    });

    expect(error.status).toBe(0);
    expect(error.code).toBe('ECONNABORTED');
  });
});
