import axios from 'axios';

export interface HttpErrorOptions {
  status: number;
  retryAfterSeconds?: number;
  code?: string;
  message?: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly code?: string;

  constructor({
    status,
    retryAfterSeconds,
    code,
    message,
  }: HttpErrorOptions) {
    super(message ?? `HTTP request failed with status ${status}.`);
    this.name = 'HttpError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.code = code;
  }
}

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function readErrorCode(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Normalizes axios/network failures into a safe `HttpError`. The raw response
 * body is never exposed, only the HTTP status, `Retry-After` and an optional
 * machine-readable code.
 */
export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      return new HttpError({
        status: error.response.status,
        retryAfterSeconds: parseRetryAfter(
          error.response.headers?.['retry-after'],
        ),
        code: readErrorCode(error.response.data),
      });
    }

    return new HttpError({
      status: 0,
      code: typeof error.code === 'string' ? error.code : undefined,
    });
  }

  return new HttpError({ status: 0 });
}
