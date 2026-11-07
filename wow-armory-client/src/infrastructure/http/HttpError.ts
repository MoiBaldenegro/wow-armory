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

// IMF-fixdate, the HTTP-date format senders must generate (RFC 9110 5.6.7),
// e.g. `Wed, 21 Oct 2026 07:28:00 GMT`.
const HTTP_DATE_PATTERN =
  /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * Reads `Retry-After` as delay-seconds or as an HTTP date. Dates become the
 * remaining seconds, rounded up and never negative.
 */
export function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (!HTTP_DATE_PATTERN.test(trimmed)) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
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
