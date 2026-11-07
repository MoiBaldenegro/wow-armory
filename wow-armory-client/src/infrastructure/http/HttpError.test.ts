import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, parseRetryAfter, toHttpError } from './HttpError';

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

describe('parseRetryAfter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts delay seconds as string or number', () => {
    expect(parseRetryAfter('42')).toBe(42);
    expect(parseRetryAfter(' 0 ')).toBe(0);
    expect(parseRetryAfter(7)).toBe(7);
  });

  it('converts an HTTP date into the remaining seconds, rounded up', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T07:27:00.500Z'));

    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBe(60);
  });

  it('returns 0 for an HTTP date in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T08:00:00Z'));

    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBe(0);
  });

  it('reads an HTTP date from the Retry-After header of a 429', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T07:27:30Z'));

    const error = toHttpError(
      axiosResponseError(429, {
        'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT',
      }),
    );

    expect(error.retryAfterSeconds).toBe(30);
  });

  it.each(['soon', '', '-5', '1.5', 'Wed, 99 Foo 2026 07:28:00 GMT', null])(
    'returns undefined for the unparseable value %s',
    (value) => {
      expect(parseRetryAfter(value)).toBeUndefined();
    },
  );
});
