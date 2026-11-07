import { LoggerService } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const VALID_REQUEST_ID = /^[A-Za-z0-9-]{1,128}$/;

export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)
    ? incoming
    : randomUUID();
}

function pathWithoutQuery(request: Request): string {
  const url = request.originalUrl || request.url || '/';
  const index = url.indexOf('?');

  return index === -1 ? url : url.slice(0, index);
}

/**
 * Logs one line per request with method, path (without query string),
 * status code, duration and request id. Headers, cookies, bodies and query
 * strings are never logged.
 */
export function createRequestLoggingMiddleware(logger: LoggerService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    const requestId = resolveRequestId(request.headers['x-request-id']);

    response.setHeader(REQUEST_ID_HEADER, requestId);

    response.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      logger.log(
        {
          message: 'request completed',
          method: request.method,
          path: pathWithoutQuery(request),
          statusCode: response.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          requestId,
        },
        'HTTP',
      );
    });

    next();
  };
}
