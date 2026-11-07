import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { AppLogger } from './app-logger';
import {
  createRequestLoggingMiddleware,
  resolveRequestId,
} from './request-logging.middleware';

function fakeResponse() {
  const emitter = new EventEmitter();
  const headers: Record<string, string> = {};
  const response = Object.assign(emitter, {
    statusCode: 200,
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  });

  return { response: response as unknown as Response, emitter, headers };
}

function run(request: Partial<Request>, statusCode = 302) {
  const lines: string[] = [];
  const logger = new AppLogger({
    format: 'json',
    level: 'log',
    write: (line) => lines.push(line),
  });
  const middleware = createRequestLoggingMiddleware(logger);
  const { response, emitter, headers } = fakeResponse();
  const next = jest.fn();

  middleware(request as Request, response, next);
  (response as unknown as { statusCode: number }).statusCode = statusCode;
  emitter.emit('finish');

  return { lines, headers, next };
}

describe('request logging middleware', () => {
  it('logs method, path without query, status, duration and request id', () => {
    const { lines, headers, next } = run({
      method: 'GET',
      originalUrl: '/auth/callback?code=SECRET_CODE&state=SECRET_STATE',
      headers: {
        cookie: 'wow_session=COOKIE_SECRET',
        authorization: 'Bearer AUTH_SECRET',
      },
      query: { code: 'SECRET_CODE', state: 'SECRET_STATE' },
      body: { password: 'BODY_SECRET' },
    });

    expect(next).toHaveBeenCalled();
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      level: 'log',
      context: 'HTTP',
      method: 'GET',
      path: '/auth/callback',
      statusCode: 302,
      durationMs: expect.any(Number),
      requestId: headers['X-Request-Id'],
    });
    expect(Object.keys(entry).sort()).toEqual(
      [
        'context',
        'durationMs',
        'level',
        'message',
        'method',
        'path',
        'requestId',
        'statusCode',
        'timestamp',
      ].sort(),
    );

    for (const sentinel of [
      'SECRET_CODE',
      'SECRET_STATE',
      'COOKIE_SECRET',
      'AUTH_SECRET',
      'BODY_SECRET',
    ]) {
      expect(lines[0]).not.toContain(sentinel);
    }
  });

  it('reuses a valid incoming X-Request-Id and echoes it', () => {
    const { lines, headers } = run({
      method: 'GET',
      originalUrl: '/health',
      headers: { 'x-request-id': 'abc-123' },
    });

    expect(headers['X-Request-Id']).toBe('abc-123');
    expect(JSON.parse(lines[0]).requestId).toBe('abc-123');
  });

  it('generates a UUID when the incoming id is invalid', () => {
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    expect(resolveRequestId('bad id with spaces')).toMatch(uuid);
    expect(resolveRequestId('a'.repeat(129))).toMatch(uuid);
    expect(resolveRequestId(['a', 'b'])).toMatch(uuid);
    expect(resolveRequestId(undefined)).toMatch(uuid);
    expect(resolveRequestId('a'.repeat(128))).toBe('a'.repeat(128));
  });
});
